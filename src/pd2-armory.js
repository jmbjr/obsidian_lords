// PD2 armory JSON importer, independent of network or UI.
// Only use the player's equipped items (never mercenary or weapon switch),
// and retain all source item data for later modeling and round trips.
import { emptyBonus } from "./amazon-comparison.js";

export const armoryCharacterUrl = name =>
  `https://api.projectdiablo2.com/game/character/${encodeURIComponent(name)}`;

export const validArmoryName = name =>
  typeof name === "string" && /^[A-Za-z][A-Za-z0-9_-]{1,23}$/.test(name);

// These published snapshots are served from the same origin as GitHub Pages.
// The base is Vite's configured BASE_URL ("/obsidian_lords/").
export function publishedArmoryUrl(name, baseUrl) {
  if (!validArmoryName(name)) throw new Error("Enter a valid character name (2–24 letters/numbers, hyphen or underscore)");
  if (typeof baseUrl !== "string" || !baseUrl.startsWith("/") || !baseUrl.endsWith("/"))
    throw new Error("Invalid published site base path");
  return `${baseUrl}armory/${name.toLowerCase()}.json`;
}

export async function loadPublishedArmoryCharacter(name, baseUrl, fetchImpl=fetch) {
  const url = publishedArmoryUrl(name,baseUrl);
  // Do not rely on CDN/browser freshness; old snapshots may otherwise appear
  // to persist after a successful GitHub Actions deployment.
  const response = await fetchImpl(`${url}?v=${Date.now()}`,{cache:"no-store",credentials:"omit"});
  if (!response.ok) {
    if(response.status===404) throw new Error("No published snapshot found. Run the GitHub sync workflow for this character, then retry after Pages deployment.");
    throw new Error(`Published snapshot HTTP ${response.status}`);
  }
  const payload = await response.json();
  if (!payload?.character?.name ||
      payload.character.name.toLowerCase() !== name.toLowerCase() ||
      payload._obsidianLordsSync?.character?.toLowerCase() !== name.toLowerCase() ||
      !Number.isFinite(Date.parse(payload._obsidianLordsSync?.syncedAt))) {
    throw new Error("Published character snapshot has invalid identity or sync metadata");
  }
  return payload;
}

const integer=(value,min=0,max=1000000)=>Number.isInteger(value)&&value>=min&&value<=max;
const mods=item=>(item?.modifiers||[]);
const hasActiveEquipment=item=>item?.location?.zone==="Equipped" &&
  integer(item.location.equipment_id,1,10);
const get=(mod)=>Array.isArray(mod.values)?mod.values[0]:undefined;

export function importArmoryAmazon(payload, skills) {
  const c=payload?.character;
  if(!c||c.class?.id!==0||!Array.isArray(c.skills)||!Array.isArray(payload.items))
    throw new Error("Expected PD2 Amazon armory JSON with skills and items");
  if(!integer(c.level,1,99))throw new Error("Invalid Amazon level");
  const index=new Map(skills.map(s=>[s.identity.internalId,s]));
  const build=Object.fromEntries(skills.map(s=>[s.identity.internalId,0]));
  const warnings=[];
  const seen=new Set();
  for(const entry of c.skills){
    const skill=index.get(entry.id);
    if(!skill){if(entry.level)warnings.push(`Unsupported skill ID ${entry.id}`);continue;}
    if(seen.has(entry.id))throw new Error(`Duplicate skill ID ${entry.id}`);
    seen.add(entry.id);
    if(!integer(entry.level,0,skill.selected.maxLevel))throw new Error(`Invalid points for ${skill.identity.internalName}`);
    build[entry.id]=entry.level;
  }
  const bonus=emptyBonus();
  const equipped=payload.items.filter(hasActiveEquipment);
  // Armory items are already resolved. Do not recursively count socketed
  // runes or jewels again; weapon switch slots 11/12 are not active.
  for(const item of equipped){
    for(const mod of mods(item)){
      const n=get(mod);
      if(!Number.isFinite(n))continue;
      if(mod.name==="item_addclassskills"&&mod.values?.[0]===0){
        if(integer(mod.values?.[1],0,100))bonus.all+=mod.values[1];
      }
      // Other +skill families need their source ID/selection semantics mapped
      // from S14 tables before aggregation; retain raw data, warn rather than guess.
      if(["item_addskill_tab","item_singleskill","item_nonclassskill"].includes(mod.name))
        warnings.push(`Unmapped effective skill modifier ${mod.name} on ${item.name||item.base?.name}`);
    }
  }
  const per=(name)=>equipped.reduce((a,item)=>a+mods(item).filter(m=>m.name===name).reduce((b,m)=>b+(Number(get(m))||0),0),0);
  const equippedWeapon=equipped.find(item=>item.location.equipment_id===4 && item.category==="weapon")||null;
  const bow=equippedWeapon?.damage?.two_handed;
  if(!equippedWeapon||!bow?.minimum||!bow?.maximum)
    warnings.push("No active physical bow damage found; manual physical-damage input retained");
  const recognized={
    deadlyStrike:per("item_deadlystrike"),
    crushingBlow:per("item_crushingblow"),
    openWoundsChance:per("item_openwounds"),
    openWoundsDamagePerSecond:per("deep_wounds"),
    attackSpeed:per("item_fasterattackrate"),
    pierceFromEquipment:per("item_pierce"),
    flatAttackRating:per("tohit"),
    otherEnhancedDamagePercent:per("maxdamage_percent"),
    weaponDamage:bow?.minimum>=0&&bow.maximum>=bow.minimum?{min:bow.minimum,max:bow.maximum}:null,
  };
  // Do not merge mercenary, inventory-only charms, or weapon-switch gear;
  // inventory charm effects and passive stats need their own scope model.
  if(payload.items.some(item=>item.location?.storage==="Inventory"))
    warnings.push("Inventory charm effects preserved in source but not added to combat stats");
  if(payload.mercenary?.items?.length)
    warnings.push("Mercenary equipment excluded from player combat stats");
  if(recognized.otherEnhancedDamagePercent)
    warnings.push("Equipment enhanced damage includes weapon affixes; not automatically passed as off-weapon ED");
  if(c.status?.is_dead&&!c.status?.is_hardcore)
    warnings.push("Armory reports is_dead on a softcore character; retained without interpretation");
  return {
    name:c.name,level:c.level,unspentSkillPoints:c.points?.skill,
    build,bonus,equippedWeapon,recognized,
    warnings,
    source:payload,
  };
}

export async function fetchArmoryCharacter(name,fetchImpl=fetch) {
  if(!/^[A-Za-z][A-Za-z0-9_-]{1,23}$/.test(name))
    throw new Error("Enter a valid character name (2–24 letters/numbers, hyphen or underscore)");
  const response=await fetchImpl(armoryCharacterUrl(name),{method:"GET",mode:"cors",credentials:"omit"});
  if(!response.ok)throw new Error(`PD2 armory HTTP ${response.status}`);
  const payload=await response.json();
  if(payload?.character?.name?.toLowerCase()!==name.toLowerCase())
    throw new Error("Armory response character name mismatch");
  return payload;
}
