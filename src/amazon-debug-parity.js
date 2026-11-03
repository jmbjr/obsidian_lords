// Read-only M9d diagnostic comparison against the pinned M8 game screenshots.
// Never elevate a partial calculation to verified parity or treat reference
// screenshots as live game readings for a changed loadout.
import { PARITY_OBSERVATIONS, buildAmazonParityObservations } from "./amazon-parity.js";
import { importArmoryAmazon } from "./pd2-armory.js";

const sameObject=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const standard=(settings={})=>settings.weaponSet==="main" &&
  settings.includeEquipment!==false && settings.includeCharms!==false &&
  (settings.excludedItemIds||[]).length===0 && (settings.excludedCharmIds||[]).length===0;
const keys=[
  "character.multipleShotAttackRating","extended.baseArDex","extended.baseArGear",
  "extended.baseArTotal","skill.multipleShot.level",
  "character.multipleShotDamageMin","character.multipleShotDamageMax",
  "extended.ias","extended.multipleShotFrames","character.defense",
  "extended.defenseGear","extended.projectilePierce","extended.criticalStrike",
  "extended.deadlyStrike","extended.crushingBlow","extended.openWoundsChance",
  "extended.openWoundsDps","character.strength","character.dexterity",
  "character.fireResist","character.coldResist","character.lightResist",
  "character.poisonResist","character.stamina","character.magicArrowAttackRating",
];
export const DEBUG_PARITY_KEYS=Object.freeze(keys);

export function buildAmazonDebugComparison(payload,skills,build,bonus,settings={},attackProjection=null) {
  if(!payload?.character)return {referenceAvailable:false,comparable:false,rows:[],reasons:["No source character loaded"]};
  const reference=PARITY_OBSERVATIONS.provenance;
  const pinned=payload.character.name?.toLowerCase()===reference.observedCharacter.toLowerCase() &&
    payload._obsidianLordsSync?.syncedAt===reference.armorySnapshot.syncedAt;
  // The project already pins the reference to the exact snapshot. Check for
  // modifications to skill allocations and bonuses independently of gear.
  const original=importArmoryAmazon(payload,skills);
  const currentPoints=Object.fromEntries(Object.keys(original.build).map(id=>[id,build?.[id]??0]));
  const originalPoints=Object.fromEntries(Object.keys(original.build).map(id=>[id,original.build[id]??0]));
  const pointsMatch=sameObject(currentPoints,originalPoints);
  const bonusMatch=sameObject(bonus,original.bonus);
  const noOverride=attackProjection?.attackRating?.baseSource!=="measured override";
  const reasons=[];
  if(!pinned)reasons.push("Character or snapshot differs from the Magizon screenshot reference");
  if(!standard(settings))reasons.push("Selected weapon set, equipment or charms differ from the captured baseline");
  if(!pointsMatch||!bonusMatch)reasons.push("Skill points or skill bonuses differ from the imported baseline");
  if(!noOverride)reasons.push("Measured base AR override is enabled");
  const comparable=reasons.length===0;
  const current=buildAmazonParityObservations(payload,skills,{
    ...settings,build,bonus,
  });
  const mapped=new Map(current.rows.map(row=>[row.key,row]));
  const rows=keys.map(key=>{
    const row=mapped.get(key);
    if(!row)return null;
    const computed=key==="character.multipleShotAttackRating" && attackProjection ?
      attackProjection.attackRating.value:row.modeled;
    const numerical=typeof computed==="number"&&typeof row.observed==="number";
    return {key,label:row.label,view:row.view,observed:pinned?row.observed:null,
      computed,delta:pinned&&numerical?computed-row.observed:null,
      status:row.modelStatus,verdict:comparable?row.verdict:"reference-not-comparable",
      comparable,note:row.explanation,
      sources:row.evidence||[],
      referenceSource:pinned?"Pinned in-game screenshot transcription":"No matching screenshot reference"};
  }).filter(Boolean);
  const primary=rows.find(row=>row.key==="character.multipleShotAttackRating")||null;
  return {schemaVersion:1,referenceAvailable:pinned,comparable,reasons,
    screenshotCapture:"Earlier in-game screenshots (not a live Armory game value)",
    syncedAt:reference.armorySnapshot.syncedAt,
    primary,rows,
    warning:!pinned?"No matching screenshot data: the reference numbers are intentionally hidden.":
      comparable?"Current values use the captured baseline; partial calculations are still unverified.":
      "Screenshot values are historical; the current configuration is different. Differences shown are illustrative, NOT parity failures."};
}
