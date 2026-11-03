// Source-preserving PD2 Armory equipment graph (no gameplay arithmetic).
// Switchable loadouts affect ONLY hand slots: main 4/5 vs switch 11/12.
// All armor/jewelry remains shared between weapon sets. This model never
// treats a socketed child's modifiers as additional resolved item modifiers.
export const WEAPON_HAND_SETS = Object.freeze({ main: [4, 5], switch: [11, 12] });
const MAIN = new Set(WEAPON_HAND_SETS.main);
const SWITCH = new Set(WEAPON_HAND_SETS.switch);
const HANDS = new Set([...MAIN, ...SWITCH]);
const EQUIPMENT_SLOTS = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const own = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const isObj = x => x !== null && typeof x === "object" && !Array.isArray(x);
const assertSet = set => { if (set !== "main" && set !== "switch") throw new RangeError("Weapon set must be 'main' or 'switch'"); };

export function classifyArmoryItem(item, owner) {
  if (owner === "mercenary") return "mercenary";
  const loc = item?.location;
  const slot = loc?.equipment_id;
  if (loc?.zone === "Equipped" && Number.isInteger(slot) && EQUIPMENT_SLOTS.has(slot))
    return MAIN.has(slot) ? "hand-main" : SWITCH.has(slot) ? "hand-switch" : "shared-equipped";
  if (loc?.zone === "Stored" && loc?.storage === "Inventory" &&
      ["scha", "mcha", "lcha"].includes(item?.base?.type_code))
    return "inventory-charm-candidate";
  return "stored-or-other";
}

function makeItem(item, sourcePath, owner) {
  const scope = classifyArmoryItem(item, owner);
  const rawMods = Array.isArray(item?.modifiers) ? item.modifiers : [];
  const sockets = Array.isArray(item?.socketed) ? item.socketed : [];
  return {
    sourcePath, id: sourcePath,
    owner, scope,
    slot: Number.isInteger(item?.location?.equipment_id) ? item.location.equipment_id : null,
    slotLabel: item?.location?.equipment || null,
    zone: item?.location?.zone || null,
    storage: item?.location?.storage || null,
    name: item?.name || item?.base?.name || null,
    category: item?.category || null,
    baseType: item?.base?.type_code || null,
    location: item?.location || null,
    position: item?.position || null,
    // An original reference is retained so unknown fields, runeword data,
    // socket contents, corruptions, sockets and item hashes are never lost.
    raw: item,
    modifiers: rawMods.map((mod, index) => ({
      id: `${sourcePath}.modifiers[${index}]`,
      sourcePath: `${sourcePath}.modifiers[${index}]`,
      name: mod?.name || null, values: mod?.values ?? null,
      raw: mod, semantic: "unmapped",
      // Resolved parent modifiers are the only candidate contribution route.
      // Socket children are provenance only until semantics can be established.
      aggregation: "resolved-parent-only",
    })),
    sockets: sockets.map((child, index) => ({
      sourcePath: `${sourcePath}.socketed[${index}]`,
      raw: child,
      modifiers: (child?.modifiers || []).map((mod, m) => ({
        sourcePath: `${sourcePath}.socketed[${index}].modifiers[${m}]`,
        name: mod?.name || null, values: mod?.values ?? null,
        raw: mod, semantic: "unmapped", aggregation: "provenance-only",
      })),
    })),
  };
}

export function normalizeArmoryEquipment(payload) {
  if (!isObj(payload) || !Array.isArray(payload.items) || !isObj(payload.character))
    throw new TypeError("Expected a full Armory character and items payload");
  const characterItems = payload.items.map((x,i) => makeItem(x,`items[${i}]`,"character"));
  const mercenaryItems = (payload.mercenary?.items || []).map((x,i) => makeItem(x,`mercenary.items[${i}]`,"mercenary"));
  const allItems = [...characterItems,...mercenaryItems];
  const presentSlots = new Map();
  const warnings = [];
  for (const item of characterItems) {
    if (!["hand-main","hand-switch","shared-equipped"].includes(item.scope)) continue;
    if (presentSlots.has(item.slot)) warnings.push(`Multiple character items in equipped slot ${item.slot}: ${presentSlots.get(item.slot)} and ${item.sourcePath}`);
    else presentSlots.set(item.slot,item.sourcePath);
  }
  const source = {
    characterName: payload.character.name || null,
    syncedAt: payload._obsidianLordsSync?.syncedAt || null,
    source: payload._obsidianLordsSync?.source || null,
    // Retain full original payload for later mapping/debugging and round trips.
    raw: payload,
  };
  return { schemaVersion:1, source, characterItems, mercenaryItems, items: allItems, warnings };
}

export function selectEquipmentSources(graph,{weaponSet="main",includeEquipment=true,excludedItemIds=[]}={}) {
  assertSet(weaponSet);
  if (typeof includeEquipment !== "boolean") throw new TypeError("includeEquipment must be boolean");
  if (!Array.isArray(excludedItemIds)) throw new TypeError("excludedItemIds must be an array");
  const known = new Set(graph.items.map(x => x.id));
  const excluded = new Set(excludedItemIds);
  for (const id of excluded) if (!known.has(id)) throw new RangeError(`Unknown item ID ${id}`);
  const active = [], inactive = [], unresolved = [];
  for (const item of graph.items) {
    // Mercenary and inventory charms are not character equipped sources.
    // Charm eligibility requires inventory-region validation in a future PR.
    if (item.owner === "mercenary" || item.scope === "inventory-charm-candidate") {
      unresolved.push({item,reason:item.owner === "mercenary" ? "independent mercenary actor" : "inventory charm position/eligibility unverified"});
      continue;
    }
    const eligible = item.scope === "shared-equipped" ||
      (item.scope === "hand-main" && weaponSet === "main") ||
      (item.scope === "hand-switch" && weaponSet === "switch");
    if (eligible && includeEquipment && !excluded.has(item.id)) active.push(item);
    else inactive.push({item,reason:!includeEquipment ? "equipment excluded" : excluded.has(item.id) ? "item excluded" : eligible ? "not included" : item.scope==="hand-main"||item.scope==="hand-switch" ? "other weapon set" : "not equipped"});
  }
  return {
    weaponSet, includeEquipment, excludedItemIds:[...excluded],
    activeItems:active,
    inactiveItems:inactive,
    unresolvedItems:unresolved,
    // Only top-level resolved modifiers become candidates; no computed stats
    // or inferred engine behavior are claimed.
    candidateModifiers:active.flatMap(item=>item.modifiers.map(mod=>({...mod,itemId:item.id,itemScope:item.scope}))),
  };
}

export function equipmentSourceSummary(graph) {
  const scopes={};
  for(const item of graph.items) scopes[item.scope]=(scopes[item.scope]||0)+1;
  return {schemaVersion:graph.schemaVersion,characterName:graph.source.characterName,
    syncedAt:graph.source.syncedAt,scopes,duplicateSlotWarnings:graph.warnings};
}
