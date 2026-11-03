// Current-snapshot Armory diagnostic inspector (no historical screenshots).
// Compares source readings/selected parent modifiers with the projections
// actually used by the sandbox. A total AR/skill damage value is NOT provided
// by the official Armory JSON; never claim those are authoritative readings.
import { normalizeArmoryEquipment, selectEquipmentSources } from "./armory-equipment.js";
import { projectArmoryCharacterSheet } from "./armory-character-sheet.js";
import { projectAmazonRangedAttack } from "./amazon-ranged-attack.js";
import { projectAmazonExtendedInfo } from "./amazon-extended-info.js";

const integer=x=>typeof x==="number"&&Number.isFinite(x);
const asNumber=x=>integer(x)?x:null;
const scalar=(item,names)=>item.modifiers.flatMap(mod=>
  names.includes(mod.name)&&Array.isArray(mod.values)&&mod.values.length===1&&integer(mod.values[0])?
    [{item:item.name,sourcePath:mod.sourcePath,modifier:mod.name,amount:mod.values[0],values:mod.values}]:[]);
const sourceSum=entries=>entries.reduce((v,e)=>v+e.amount,0);
const row=(group,key,label,official,computed,sources=[],note="",kind="matched-semantic")=>{
  const measurable=integer(official)&&integer(computed);
  return {group,key,label,armoryValue:official,computedValue:computed,
    delta:measurable?computed-official:null,
    status:kind==="calculation-only"?"model-only":!measurable?"unavailable":official===computed?"agrees":"differs",
    kind,sources,note};
};

export function buildArmoryDebugAudit(payload,skills,build,bonus,settings={},attackProjection=null) {
  if(!payload?.character || !Array.isArray(payload.items))
    return {schemaVersion:2,available:false,rows:[],reason:"No Armory source loaded"};
  const graph=normalizeArmoryEquipment(payload);
  const selection=selectEquipmentSources(graph,settings);
  const sheet=projectArmoryCharacterSheet(payload,settings);
  const extended=projectAmazonExtendedInfo(payload,skills,build,bonus,settings).byId;
  const attack=attackProjection??projectAmazonRangedAttack(payload,skills,build,bonus,settings);
  const items=selection.activeSources;
  const attributeNames=["strength","dexterity","vitality","energy"];
  const rows=[];
  const c=payload.character;
  const direct=[
    ["level","Level",c.level,sheet.character.level.value,"character.level"],
    ["experience","Experience",c.experience,sheet.character.experience.value,"character.experience"],
    ["statPoints","Unspent stat points",c.points?.stat,sheet.character.unspentStatPoints.value,"character.points.stat"],
    ["skillPoints","Unspent skill points",c.points?.skill,sheet.character.unspentSkillPoints.value,"character.points.skill"],
    ["life","Life (Armory field)",c.life,sheet.resources.life.value,"character.life"],
    ["mana","Mana (Armory field)",c.mana,sheet.resources.mana.value,"character.mana"],
    ["stamina","Stamina (Armory field)",c.stamina,sheet.resources.stamina.value,"character.stamina"],
  ];
  for(const [key,label,official,computed,path] of direct)
    rows.push(row("Raw character",key,label,asNumber(official),computed,
      [{sourcePath:path,amount:official,kind:"raw-character-field"}],
      "Direct value in current official Armory character JSON, not the live character screen"));
  for(const key of attributeNames){
    const base=asNumber(c.attributes?.[key]);
    rows.push(row("Attributes",key+"Base",key+" (raw base)",base,sheet.baseAttributes[key].value,
      [{sourcePath:"character.attributes."+key,amount:base,kind:"raw-character-field"}],
      "Attribute values stored in the Armory character section; not the final equipped stat"));
    const entries=items.flatMap(item=>scalar(item,[key,"all_attributes"]));
    rows.push(row("Attributes",key+"Equipped",key+" (selected item + charm bonuses)",
      sourceSum(entries),sheet.attributes[key].equipment,entries,
      "Independent sum of selected item modifier tuples compared with M5 contribution; not a final game value"));
    rows.push(row("Attributes",key+"Effective",key+" (derived from JSON)",null,
      sheet.attributes[key].value,[{sourcePath:"character.attributes."+key,amount:base},...entries],
      "Derived attribute = Armory raw base + selected item/charm modifiers; official JSON does not provide a final character-screen attribute", "calculation-only"));
  }
  const metricGroups=[
    ["Attack rating","flatAttackRating","Flat AR from selected items",["tohit"],sheet.attackRating.flatEquipment.value],
    ["Attack rating","percentAttackRating","AR % from selected items",["item_tohit_percent"],sheet.attackRating.percentEquipment.value],
    ["Attack speed","ias","IAS from selected items",["item_fasterattackrate"],attack.contributions.ias.value],
    ["Combat effects","pierce","Projectile Pierce from selected items",["item_pierce"],extended.projectilePierce.equipmentValue],
    ["Combat effects","deadlyStrike","Deadly Strike from selected items",["item_deadlystrike"],extended.deadlyStrike.equipmentValue],
    ["Combat effects","crushingBlow","Crushing Blow from selected items",["item_crushingblow"],extended.crushingBlow.equipmentValue],
    ["Combat effects","openWoundsChance","Open Wounds chance from selected items",["item_openwounds"],extended.openWoundsChance.equipmentValue],
    ["Combat effects","openWoundsDps","Open Wounds DPS from selected items",["deep_wounds"],extended.openWoundsDps.equipmentValue],
    ["Resistances","fire","Fire resist from items",["fireresist","all_resist"],extended.fireResist.equipmentValue],
    ["Resistances","cold","Cold resist from items",["coldresist","all_resist"],extended.coldResist.equipmentValue],
    ["Resistances","lightning","Lightning resist from items",["lightresist","all_resist"],extended.lightResist.equipmentValue],
    ["Resistances","poison","Poison resist from items",["poisonresist","all_resist"],extended.poisonResist.equipmentValue],
  ];
  for(const [group,key,label,names,computed] of metricGroups) {
    const evidence=items.flatMap(item=>scalar(item,names));
    rows.push(row(group,key,label,sourceSum(evidence),computed,evidence,
      "Raw resolved top-level item modifiers in this exact synced JSON and selected loadout. Parent modifiers already include socket effects; no socket child double count"));
  }
  const armor=selection.activeItems.flatMap(item=>{
    const n=asNumber(item.raw?.defense?.total);
    return n===null?[]:[{sourcePath:item.sourcePath+".defense.total",item:item.name,
      amount:n,kind:"resolved-armor-defense"}];
  });
  const freeDefense=items.filter(item=>asNumber(item.raw?.defense?.total)===null)
    .flatMap(item=>scalar(item,["armorclass"]));
  rows.push(row("Defense","knownDefense","Selected gear + charm defense contribution",
    sourceSum([...armor,...freeDefense]),sheet.defense.knownEquipmentContribution.value,
    [...armor,...freeDefense],"Already-resolved item defense totals plus flat defense on non-armor items and charms; character Dexterity defense is separate"));
  const activeHand=selection.weaponSet==="main"?4:11;
  const weapon=selection.activeItems.find(item=>item.slot===activeHand&&item.category==="weapon");
  for(const [side,field] of [["min","minimum"],["max","maximum"]]) {
    const raw=asNumber(weapon?.raw?.damage?.two_handed?.[field]);
    rows.push(row("Weapon","weapon"+side,"Selected weapon resolved "+side+" damage",
      raw,attack.weapon.physical[side],
      weapon?[{sourcePath:weapon.sourcePath+".damage.two_handed."+field,item:weapon.name,amount:raw}]:[],
      "Resolved weapon-only damage directly published in current Armory item record; not the final Multiple Shot display"));
  }
  const skillsById=new Map(c.skills.map(x=>[x.id,x]));
  const multipleHard=asNumber(skillsById.get(12)?.level);
  rows.push(row("Skills","multipleShotHard","Multiple Shot hard skill points (JSON)",
    multipleHard,asNumber(build?.[12]),
    [{sourcePath:"character.skills[id=12].level",amount:multipleHard,kind:"raw-character-skill"}],
    "Hard points from the Armory skills array. Manual Build A/B point edits can cause a difference"));
  const formula=attack.attackRating.breakdown;
  const sourceEstimate=[
    ["dexterityAR","Dexterity-derived AR",formula.derivedFormula,
      "5 × effective Dexterity − 30; reconstructed, not a directly published Armory total"],
    ["baseAR","Base AR including flat equipment",formula.additiveBase,
      "Dexterity-derived base AR + selected flat item/charm AR"],
    ["multipleShotLevel","Multiple Shot effective level",attack.effective,
      "Hard points + resolved skill bonuses; no Armory field for final effective level"],
    ["multipleShotSkillArPercent","Multiple Shot AR bonus %",attack.skillAR,
      "Season 14 skill source formula; not an Armory final AR field"],
    ["multipleShotAR","Multiple Shot selected-skill AR estimate",attack.attackRating.value,
      "Provisional AR formula; the Armory JSON does not contain the official final selected-skill attack rating"],
    ["multipleShotPhysicalMin","Multiple Shot estimated physical minimum",attack.physical.min,
      "Partial physical-only model; not the Armory weapon field or a final displayed damage value"],
    ["multipleShotPhysicalMax","Multiple Shot estimated physical maximum",attack.physical.max,
      "Partial physical-only model; not the Armory weapon field or a final displayed damage value"],
    ["attackFrames","Modeled Amazon bow/crossbow attack frames",attack.speed.frames,
      "PD2 animation reconstruction, not an official final frame-count field in Armory JSON"],
  ];
  for(const [key,label,computed,note] of sourceEstimate)rows.push(row(
    "Calculated — not directly in JSON",key,label,null,computed,
    key==="multipleShotAR"?[...formula.dexSources,...formula.flatSources,...formula.percentSources]:[],
    note,"calculation-only"));
  return {
    schemaVersion:2,available:true,character:c.name,level:c.level,
    syncedAt:graph.source.syncedAt,source:graph.source.source,
    selectedSet:selection.weaponSet,activeGear:selection.activeItems.length,
    activeCharms:selection.activeCharms.length,rows,
    groups:[...new Set(rows.map(x=>x.group))],
    warning:"Official Armory raw fields and modifier tuples are source data; calculated character totals are model outputs, NOT authoritative in-game readings. No screenshot matching is required.",
  };
}
