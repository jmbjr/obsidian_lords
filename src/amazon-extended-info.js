// M7: PD2 Extended Info (8) source-traced catalog.
// Every sum below is a selected-EQUIPMENT contribution unless explicitly
// marked as a supported skill preview. None is silently advertised as the
// game's final stat with missing charms, passives, caps, difficulty and buffs.
import { normalizeArmoryEquipment, selectEquipmentSources } from "./armory-equipment.js";
import { amazonCriticalStrikeChance } from "./amazon-critical-strike.js";
import { projectAmazonRangedAttack } from "./amazon-ranged-attack.js";

const METRICS = [
  // Category, stable key, label, native modifier(s), display unit.
  ["Resistance","fireResist","Fire resistance contribution",["fireresist","all_resist"],"%"],
  ["Resistance","coldResist","Cold resistance contribution",["coldresist","all_resist"],"%"],
  ["Resistance","lightResist","Lightning resistance contribution",["lightresist","all_resist"],"%"],
  ["Resistance","poisonResist","Poison resistance contribution",["poisonresist","all_resist"],"%"],
  ["Resistance","maxFireResist","Maximum fire resistance bonus",["maxfireresist"],"%"],
  ["Resistance","maxColdResist","Maximum cold resistance bonus",["maxcoldresist"],"%"],
  ["Resistance","maxLightResist","Maximum lightning resistance bonus",["maxlightresist"],"%"],
  ["Resistance","maxPoisonResist","Maximum poison resistance bonus",["maxpoisonresist"],"%"],
  ["Resistance","halfFreezeDuration","Half Freeze Duration item flags",["item_halffreezeduration"],"flags"],
  ["Resistance","poisonLengthReduction","Poison length reduction",["item_poisonlengthresist"],"%"],
  ["Resistance","curseLengthReduction","Curse length reduction",["item_curse_resistance"],"%"],
  ["Defense","physicalDamageReductionFlat","Physical damage taken reduced (flat)",["normal_damage_reduction"],""],
  ["Defense","physicalDamageReductionPercent","Physical damage reduction (%)",["damageresist"],"%"],
  ["Defense","magicDamageReductionFlat","Magic damage taken reduced (flat)",["magic_damage_reduction"],""],
  ["Defense","magicDamageReductionPercent","Magic resistance",["magicresist"],"%"],
  ["Defense","fireAbsorbPercent","Fire absorption (%)",["item_absorbfire_percent"],"%"],
  ["Defense","coldAbsorbPercent","Cold absorption (%)",["item_absorbcold_percent"],"%"],
  ["Defense","lightAbsorbPercent","Lightning absorption (%)",["item_absorblight_percent"],"%"],
  ["Defense","magicAbsorbPercent","Magic absorption (%)",["item_absorbmagic_percent"],"%"],
  ["Defense","attackerTakesDamage","Attacker takes damage",["item_attackertakesdamage"],""],
  ["Defense","defenseVsMissile","Defense vs missile bonus",["armorclass_vs_missile"],""],
  ["Mastery & pierce","physicalPierce","Enemy physical resistance reduction",["passive_phys_pierce"],"%"],
  ["Mastery & pierce","firePierce","Enemy fire resistance reduction",["passive_fire_pierce"],"%"],
  ["Mastery & pierce","coldPierce","Enemy cold resistance reduction",["passive_cold_pierce"],"%"],
  ["Mastery & pierce","lightPierce","Enemy lightning resistance reduction",["passive_ltng_pierce"],"%"],
  ["Mastery & pierce","poisonPierce","Enemy poison resistance reduction",["passive_pois_pierce"],"%"],
  ["Mastery & pierce","projectilePierce","Projectile Pierce chance (equipment)",["item_pierce"],"%"],
  ["Speed","ias","Increased Attack Speed (IAS)",["item_fasterattackrate"],"%"],
  ["Speed","fcr","Faster Cast Rate",["item_fastercastrate"],"%"],
  ["Speed","fhr","Faster Hit Recovery",["item_fastergethitrate"],"%"],
  ["Speed","fbr","Faster Block Rate",["item_fasterblockrate"],"%"],
  ["Speed","frw","Faster Run/Walk",["item_fastermovevelocity"],"%"],
  ["Critical & procs","deadlyStrike","Deadly Strike (equipment chance)",["item_deadlystrike"],"%"],
  ["Critical & procs","crushingBlow","Crushing Blow (equipment chance)",["item_crushingblow"],"%"],
  ["Critical & procs","openWoundsChance","Open Wounds (equipment chance)",["item_openwounds"],"%"],
  ["Critical & procs","openWoundsDps","Open Wounds damage per second (equipment)",["deep_wounds"]," DPS"],
  ["Leech & recovery","lifeLeech","Life stolen per hit",["lifedrainmindam"],"%"],
  ["Leech & recovery","manaLeech","Mana stolen per hit",["manadrainmindam"],"%"],
  ["Leech & recovery","lifeAfterKill","Life after each kill",["item_healafterkill"],""],
  ["Leech & recovery","manaAfterKill","Mana after each kill",["item_manaafterkill"],""],
  ["Leech & recovery","lifeReplenish","Replenish life",["hpregen"],""],
  ["Leech & recovery","manaRegeneration","Mana regeneration bonus",["manarecoverybonus"],"%"],
  ["Magic & gold","magicFind","Better chance of magic items",["item_magicbonus"],"%"],
  ["Magic & gold","goldFind","Extra gold from monsters",["item_goldbonus"],"%"],
  ["Attack additions","minDamage","Off-weapon minimum damage",["min_damage"],""],
  ["Attack additions","maxDamage","Off-weapon maximum damage",["max_damage"],""],
  ["Attack additions","attackRatingFlat","Flat equipment attack rating",["tohit"],""],
  ["Attack additions","attackRatingPercent","Equipment attack rating percent",["item_tohit_percent"],"%"],
  ["Attack additions","damageVsDemons","Damage to demons",["item_demondamage_percent"],"%"],
  ["Attack additions","damageVsUndead","Damage to undead",["item_undeaddamage_percent"],"%"],
  ["Attack additions","attackRatingVsUndead","Attack rating vs undead",["item_undead_tohit"],""],
];
const ELEMENTS = [
  ["fireDamage","Fire attack damage","firedam"],
  ["lightningDamage","Lightning attack damage","lightdam"],
  ["coldDamage","Cold attack damage","colddam"],
  ["poisonDamage","Poison attack damage","poisondam"],
];
export const EXTENDED_INFO_CATEGORIES = Object.freeze([
  ...new Set([...METRICS.map(x=>x[0]),"Elemental additions","Derived & unsupported"]),
]);
const numeric = value => typeof value==="number" && Number.isFinite(value);
const asContribution = (item,mod,amount) => ({
  sourcePath:mod.sourcePath,itemId:item.id,item:item.name,slot:item.slot,
  modifier:mod.name,values:mod.values,amount,
  kind:"resolved-parent-item-modifier",
});
function additiveMetric(items,config) {
  const [category,id,label,modifiers,unit]=config;
  const sources=[],unresolved=[];
  for(const item of items)for(const mod of item.modifiers){
    if(!modifiers.includes(mod.name))continue;
    if(Array.isArray(mod.values)&&mod.values.length===1&&numeric(mod.values[0])){
      sources.push(asContribution(item,mod,mod.values[0]));
    } else unresolved.push({sourcePath:mod.sourcePath,modifier:mod.name,values:mod.values,
      reason:"Requires one numeric value, not an ambiguous tuple"});
  }
  return {category,id,label,unit,equipmentValue:sources.reduce((v,s)=>v+s.amount,0),
    finalValue:null,status:"equipment-only",sources,unresolved,
    note:"Sum of selected equipped item modifiers only; does not establish final in-game value"};
}
function elementalMetric(items,[id,label,modifier]) {
  const sources=[],unresolved=[];
  for(const item of items)for(const mod of item.modifiers){
    if(mod.name!==modifier)continue;
    const v=mod.values;
    if(Array.isArray(v)&&(v.length===2||v.length===3) && v.every(numeric) && v[0]>=0 && v[1]>=0) {
      sources.push({...asContribution(item,mod,null),min:v[0],max:v[1],
        duration:v.length===3?v[2]:null});
    } else unresolved.push({sourcePath:mod.sourcePath,values:v,reason:"Unsupported damage tuple"});
  }
  const distinctDurations=new Set(sources.map(s=>s.duration));
  const aggregatable=modifier!=="poisondam" && (modifier!=="colddam" || distinctDurations.size<=1);
  return {category:"Elemental additions",id,label,unit:" damage",status:"equipment-only",
    equipmentValue:aggregatable?{
      min:sources.reduce((v,s)=>v+s.min,0),max:sources.reduce((v,s)=>v+s.max,0),
    }:null,
    duration:distinctDurations.size===1?[...distinctDurations][0]:null,
    finalValue:null,sources,unresolved,
    note:aggregatable?"Raw item damage ranges only; weapon applicability, cold duration and runtime effects require verification":"Poison damage/duration (or mixed cold durations) must not be naïvely summed; individual item tuples retained"};
}
function unsupported(category,id,label,reason) {
  return {category,id,label,equipmentValue:null,finalValue:null,status:"unsupported",
    sources:[],unresolved:[],note:reason};
}
export function projectAmazonExtendedInfo(payload,skills,build,bonus,options={}) {
  const graph=normalizeArmoryEquipment(payload);
  const selection=selectEquipmentSources(graph,options);
  const rows=METRICS.map(config=>additiveMetric(selection.activeItems,config));
  rows.push(...ELEMENTS.map(config=>elementalMetric(selection.activeItems,config)));
  const ranged=projectAmazonRangedAttack(payload,skills,build,bonus,options);
  const critical=amazonCriticalStrikeChance(skills.find(s=>s.identity.internalId===9),build,bonus);
  rows.push({
    category:"Critical & procs",id:"criticalStrike",label:"Critical Strike (skill preview)",unit:"%",
    equipmentValue:null,finalValue:critical,status:critical===null?"unsupported":"skill-preview",
    sources:[],unresolved:[],note:"Native S14 dm12 passive preview; final game caps, strike interaction and runtime state not independently verified",
  });
  rows.push({
    category:"Speed",id:"amazonRangedFrames",label:"Amazon selected ranged attack frames",unit:" frames",
    equipmentValue:rows.find(r=>r.id==="ias").equipmentValue,
    finalValue:ranged.speed.frames,status:ranged.speed.frames===null?"unsupported":"source-derived",
    sources:rows.find(r=>r.id==="ias").sources,unresolved:[],
    note:"Pinned PD2 Amazon A1 animation, selected weapon WSM, equipment IAS; excludes unmodeled aura/slow/charms",
  });
  rows.push(unsupported("Mastery & pierce","projectilePierceFinal","Total projectile Pierce (incl. passive)",
    "Only equipped item_pierce is resolved. Effective Amazon Pierce passive formula and applicability still need verification."));
  rows.push(unsupported("Critical & procs","deadlyCriticalCombined","Combined critical/deadly strike chance",
    "Deadly Strike and Critical Strike interaction and caps must not be added as separate guaranteed multipliers."));
  rows.push(unsupported("Attack additions","finalAttackDamage","Final displayed attack damage",
    "M6 produces a partial Multiple Shot damage estimate; this extended-info field requires other active effects and snapshot parity."));
  rows.push(unsupported("Attack additions","baseOneHandDamage","Base one-handed damage",
    "A ranged weapon loadout does not supply a verified game-display base-one-hand damage value."));
  rows.push(unsupported("Attack additions","baseTwoHandDamage","Base two-handed damage",
    "Weapon resolved damage is available in M5/M6, but the extended-info base two-hand display has different semantics."));
  rows.push(unsupported("Attack additions","baseAttackRating","Base AR including Dexterity",
    "No verified full baseline AR equation yet; M6 supports measured base AR override only."));
  rows.push(unsupported("Defense","baseDefenseDexterity","Base defense from Dexterity",
    "Requires verified game-screen base-defense equation, rounding and active gear context."));
  return {
    schemaVersion:1,
    characterName:payload.character.name,
    weaponSet:selection.weaponSet,selectedItemIds:selection.activeItems.map(i=>i.id),
    categories:EXTENDED_INFO_CATEGORIES,
    rows,byId:Object.fromEntries(rows.map(r=>[r.id,r])),
    unmappedScopeCount:selection.unresolvedItems.length,
    warning:"Equipment contributions, not full in-game Extra Info (8) totals. Final caps, passive skills, charms, difficulty and buffs remain unresolved.",
    source:{syncedAt:graph.source.syncedAt,characterName:graph.source.characterName},
  };
}
