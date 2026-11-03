// M6 Amazon ranged attack projection from selected live Armory equipment.
// Explicitly separates a source-backed partial estimate from in-game parity.
// It does not multiply the weapon's already-resolved ED a second time.
import { normalizeArmoryEquipment, selectEquipmentSources } from "./armory-equipment.js";
import { projectArmoryCharacterSheet } from "./armory-character-sheet.js";
import { bonusForSkill } from "./amazon-comparison.js";
import { pd2RangedWeaponSpeed, PD2_AMAZON_RANGED_ANIM } from "./pd2-ranged-animations.js";

const finite=x=>typeof x==="number" && Number.isFinite(x);
const single=m=>Array.isArray(m.values)&&m.values.length===1&&finite(m.values[0])?m.values[0]:null;
const sum=arr=>arr.reduce((n,s)=>n+s.amount,0);
const sources=(items,name,omit=()=>false)=>items.flatMap(item=>item.modifiers.filter(m=>m.name===name&&!omit(item,m))
  .flatMap(mod=>{const amount=single(mod);return amount===null?[]:[{path:mod.sourcePath,item:item.name,itemId:item.id,slot:item.slot,modifier:name,amount}]}));
const derived=(parts,status="equipment-derived")=>({value:sum(parts),status,sources:parts});

export function pd2AmazonRangedFrames({ias,weaponCode,skillSpeed=0}={}) {
  if(!Number.isInteger(ias)||ias<0||ias>1000)throw new RangeError("IAS must be an integer between 0 and 1000");
  if(!Number.isInteger(skillSpeed)||skillSpeed<-100||skillSpeed>100)throw new RangeError("Skill speed outside supported range");
  const weapon=pd2RangedWeaponSpeed(weaponCode);
  if(!weapon)return {status:"unavailable",frames:null,reason:"No pinned PD2 ranged weapon speed for this base",weaponCode};
  const animation=PD2_AMAZON_RANGED_ANIM[weapon.animation];
  if(!animation)return {status:"unavailable",frames:null,reason:"No pinned Amazon ranged A1 animation"};
  const eias=Math.trunc(120*ias/(120+ias));
  const speed=Math.max(15,Math.min(175,100+skillSpeed-weapon.wsm+eias));
  const rate=Math.floor(animation.animSpeed*speed/100);
  const frames=Math.ceil((animation.frames-animation.start)*256/rate)-1;
  return {status:"source-derived",frames,ias,eias,skillSpeed,speed,rate,
    wsm:weapon.wsm,weaponCode,animation:weapon.animation,
    assumption:"Amazon A1 attack animation; no unmodeled aura, slow, or skill-speed state"};
}

export function projectAmazonRangedAttack(payload,skills,build,bonus,options={}) {
  const {weaponSet="main",includeEquipment=true,excludedItemIds=[],includeCharms=true,excludedCharmIds=[],baseAttackRatingOverride=null,skillId=12,skillSpeed=0}=options;
  const graph=normalizeArmoryEquipment(payload);
  const selected={weaponSet,includeEquipment,excludedItemIds,includeCharms,excludedCharmIds};
  const selection=selectEquipmentSources(graph,selected);
  const sheet=projectArmoryCharacterSheet(payload,selected);
  const skill=skills.find(x=>x.identity.internalId===skillId)||null;
  const hard=Number(build?.[skillId]||0),direct=Number(bonus?.skills?.[skillId]||0);
  const effective=skill && (hard>0||direct>0)?hard+bonusForSkill(skill,bonus):0;
  const supported=skillId===12&&effective>0;
  const items=selection.activeSources;
  const rightHand=selection.weaponSet==="main"?4:11;
  const weapon=items.find(x=>x.slot===rightHand&&x.category==="weapon")||null;
  const weaponCode=weapon?.raw?.base_code||weapon?.raw?.base?.id||null;
  const weaponRange=sheet.weapon.physical;
  const other=items.filter(x=>x.id!==weapon?.id);
  const offMin=derived(sources(other,"min_damage"));
  const offMax=derived(sources(other,"max_damage"));
  // Non-weapon ED includes quivers, armor, gloves, etc. Do not reapply
  // the weapon's own ED after item.damage.two_handed is resolved.
  const offED=derived(other.flatMap(item=>item.modifiers.filter(m=>m.name==="maxdamage_percent")
    .flatMap(mod=>{const n=Array.isArray(mod.values)?mod.values[0]:null;return finite(n)?[{
      path:mod.sourcePath,item:item.name,itemId:item.id,slot:item.slot,
      modifier:mod.name,amount:n,
    }]:[]})));
  const ias=derived(sources(items,"item_fasterattackrate"));
  const flatAR=sheet.attackRating.flatEquipment;
  const arPct=sheet.attackRating.percentEquipment;
  const dex=sheet.attributes.dexterity.value;
  const skillED=supported?50+4*(effective-1):null;
  const skillAR=supported?8+6*(effective-1):null;
  const canPhysical=supported && weaponRange.status==="source" && dex!==null;
  const ed=canPhysical?dex+offED.value+skillED:null;
  const physical=canPhysical ? {
    min:Math.max(0,Math.floor((weaponRange.min+offMin.value)*(100+ed)/100)),
    max:Math.max(0,Math.floor((weaponRange.max+offMax.value)*(100+ed)/100)),
    status:"partial",reason:"D2-family ranged Dexterity/ED composition; missing charms, skill/aura effects, special multipliers and engine rounding",
    enhancedDamagePercent:ed,
  }:{min:null,max:null,status:"unavailable",reason:"Requires available Multiple Shot and a supported equipped ranged weapon"};
  const validBase=baseAttackRatingOverride===null || (Number.isInteger(baseAttackRatingOverride)&&baseAttackRatingOverride>=0&&baseAttackRatingOverride<=100000000);
  if(!validBase)throw new RangeError("Base AR override must be a nonnegative integer or null");
  const baseAR=baseAttackRatingOverride??sheet.attackRating.fromDexterity.value;
  const baseSource=baseAttackRatingOverride===null?"dexterity-derived":"measured override";
  const totalAR=baseAR!==null&&supported?
    Math.max(0,Math.trunc((baseAR+flatAR.value)*(100+skillAR+arPct.value)/100)):null;
  const frames=weapon?pd2AmazonRangedFrames({ias:ias.value,weaponCode,skillSpeed}):
    {status:"unavailable",frames:null,reason:"No equipped ranged weapon"};
  return {
    schemaVersion:1,skillId,hard,effective,skillED,skillAR,
    weapon:{name:weapon?.name||null,slot:rightHand,baseCode:weaponCode,
      physical:weaponRange},
    contributions:{offWeaponMin:offMin,offWeaponMax:offMax,offWeaponED:offED,
      dexterity:sheet.attributes.dexterity,flatAttackRating:flatAR,
      percentAttackRating:arPct,ias},
    physical,
    attackRating:{value:totalAR,status:totalAR===null?"unavailable":"partial",
      baseWithoutEquipment:baseAR,baseSource,flatEquipment:flatAR.value,
      skillPercent:skillAR,equipmentPercent:arPct.value,
      reason:totalAR===null?"No valid Dexterity-derived base AR is available; a measured override can provide it.":"Conditional selected-skill estimate: game AR percent stacking, passive skills and runtime effects remain unverified"},
    speed:{...frames,observedIAS:ias.value,
      note:"Normal Amazon ranged A1 frames computed from pinned PD2 animation and weapon speed tables; assumes no skill-speed buffs/debuffs. Not yet verified as the in-game selected-skill breakpoint display."},
    assumptions:["Weapon damage from Armory is already resolved; weapon-local ED/min/max is not re-added",
      "Only position-verified active inventory charms are included; mercenary auras and unverified buffs excluded",
      "Only Multiple Shot physical and AR percentages are formula-supported in this M6 model",
      "Amazon Dexterity-derived base AR uses sourced D2 formula, matched to the pinned PD2 screen; final skill AR stacking is still unverified"],
  };
}
