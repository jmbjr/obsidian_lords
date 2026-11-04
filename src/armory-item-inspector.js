// M11: source-first item inventory and loadout inspector. No gameplay arithmetic.
// All raw totals are hypothetical; configured totals honor user equipment/charm
// selection and never treat inactive switch hands as simultaneously equipped.
import {normalizeArmoryEquipment, pd2CharmCells} from "./armory-equipment.js";

const numeric = value => typeof value === "number" && Number.isFinite(value);
const stored = item => item.zone === "Stored";
const cube = item => stored(item) && /^(?:horadric\s*)?cube$/i.test(item.storage||"");
const inventory = item => stored(item) && item.storage === "Inventory";
const statKey = name => typeof name === "string" && name.length ? name : "(unnamed modifier)";

// Selectors / state flags and multi-part encodings are intentionally not
// additive even if the payload contains numeric values.
const NONADDITIVE = new Set([
  "corrupted","item_addclassskills","item_addskill_tab","item_singleskill",
  "item_nonclassskill","item_aura","item_charged_skill","item_allskills",
  "item_explosivearrow","item_cannotbefrozen",
]);
const SELECTOR_PREFIX = /^(?:item_aura|item_.*skill|skill_|state_)/;
const additive = mod => Array.isArray(mod.values) &&
  mod.values.length===1 && numeric(mod.values[0]) &&
  !NONADDITIVE.has(mod.name) && !SELECTOR_PREFIX.test(mod.name);

function inspect(item) {
  return {
    id:item.id,name:item.name||"(unnamed item)",sourcePath:item.sourcePath,
    slot:item.slot,slotLabel:item.slotLabel,storage:item.storage,
    position:item.position,scope:item.scope,baseType:item.baseType,
    // Display parent-resolved affixes only. Socket children remain raw evidence.
    modifiers:item.modifiers.map(mod=>({
      name:statKey(mod.name),label:mod.raw?.label||mod.name||"Unlabeled",
      values:mod.values,sourcePath:mod.sourcePath,additive:additive(mod),
      raw:mod.raw,
    })),
    resolvedDefense:item.raw?.defense?.total??null,
    resolvedWeaponDamage:item.raw?.damage??null,
    sockets:item.sockets.map(x=>({sourcePath:x.sourcePath,raw:x.raw})),
    corrupted:Boolean(item.raw?.corrupted),runeword:item.raw?.runeword?.name||null,
  };
}

function summarize(items) {
  const totals = new Map(),nonadditive = new Map();
  for(const item of items)for(const mod of item.modifiers){
    if(mod.additive){
      const prev=totals.get(mod.name)||{name:mod.name,value:0,count:0,sources:[]};
      prev.value+=mod.values[0];prev.count++;
      prev.sources.push({path:mod.sourcePath,amount:mod.values[0],item:item.name});
      totals.set(mod.name,prev);
    }else{
      const prev=nonadditive.get(mod.name)||{name:mod.name,count:0,entries:[]};
      prev.count++;
      prev.entries.push({path:mod.sourcePath,values:mod.values,item:item.name,label:mod.label});
      nonadditive.set(mod.name,prev);
    }
  }
  return {itemCount:items.length,
    additive:[...totals.values()].sort((a,b)=>a.name.localeCompare(b.name)),
    nonadditive:[...nonadditive.values()].sort((a,b)=>a.name.localeCompare(b.name)),
    // Resolved defense/weapon damage are item properties, not independent
    // modifiers; show these on individual items, not in generic stat sums.
  };
}

const group=(key,title,raw,configured,description)=>({
  key,title,description,items:raw.map(inspect),
  rawSummary:summarize(raw.map(inspect)),
  configuredSummary:summarize(configured.map(inspect)),
  configuredCount:configured.length,
});

// Returns all sections even when empty. Inactive switch hands are never
// counted together as a currently equipped character loadout.
export function buildArmoryItemInspector(payload,settings={}) {
  const graph=normalizeArmoryEquipment(payload);
  const items=graph.characterItems;
  const excluded=new Set(settings.excludedItemIds||[]);
  const charmExcluded=new Set(settings.excludedCharmIds||[]);
  const equipmentOn=settings.includeEquipment!==false;
  const charmsOn=settings.includeCharms!==false;
  const shared=items.filter(x=>x.scope==="shared-equipped");
  const main=items.filter(x=>x.scope==="hand-main");
  const alternate=items.filter(x=>x.scope==="hand-switch");
  const included=xs=>equipmentOn?xs.filter(x=>!excluded.has(x.id)):[];
  const charms=items.filter(x=>x.scope==="inventory-charm-candidate");
  const occupied=new Set(),eligible=[];
  // Match the source resolver's full geometry/overlap screening. Even excluded
  // eligible charms reserve their source positions.
  for(const item of charms){
    const cells=pd2CharmCells(item);
    if(cells.status!=="active-position"||cells.cells.some(cell=>occupied.has(cell)))continue;
    cells.cells.forEach(cell=>occupied.add(cell));
    eligible.push(item);
  }
  const activeCharms=charmsOn?eligible.filter(x=>!charmExcluded.has(x.id)):[];
  const normal=items.filter(x=>inventory(x)&&x.scope!=="inventory-charm-candidate");
  const cubed=items.filter(cube);
  const other=items.filter(x=>x.scope==="stored-or-other"&&!normal.includes(x)&&!cubed.includes(x));
  const equipment=[
    group("mainHands","Main hands · slots 4 / 5",main,included(main),"Weapon and off-hand; compared independently of other equipped items."),
    group("alternateHands","Alternate hands · slots 11 / 12",alternate,included(alternate),"Switch weapon and off-hand; never active alongside main hands."),
    group("sharedEquipped","Other equipped · shared gear",shared,included(shared),"Armor, jewelry and other shared slots; applies to either selected hand set."),
    group("mainCombined","Main hands + other equipped", [...main,...shared],included([...main,...shared]),"Main loadout composite; no alternate-hand contribution."),
    group("alternateCombined","Alternate hands + other equipped",[...alternate,...shared],included([...alternate,...shared]),"Alternate loadout composite; no main-hand contribution."),
  ];
  const sections=[
    group("charms","Charm inventory",charms,activeCharms,"All-charm sums are hypothetical; configured sums include only eligible, enabled charms."),
    group("inventory","Main inventory · non-charm",normal,[],"Stored items do not contribute to character stats. Raw totals are hypothetical."),
    group("cube","Horadric Cube inventory",cubed,[],"Cube contents do not contribute to character stats. Raw totals are hypothetical."),
  ];
  if(other.length)sections.push(group("otherStored","Other stored / unresolved locations",other,[],
    "Source retained but not assigned to normal inventory, cube or equipped gear."));
  const eligibleIds=new Set(eligible.map(x=>x.id));
  return {
    schemaVersion:1,character:graph.source.characterName,syncedAt:graph.source.syncedAt,
    selectedWeaponSet:settings.weaponSet||"main",equipment,sections,
    charmEligibility:charms.map(x=>({
      id:x.id,eligible:eligibleIds.has(x.id),active:activeCharms.some(a=>a.id===x.id),
      geometry:pd2CharmCells(x).status,
    })),warnings:graph.warnings,
  };
}
