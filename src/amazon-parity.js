// M8: screenshot-to-source parity evidence, not a substitute for PD2 formulas.
// The screenshot fixture is observational; numerical differences for partial
// projections are diagnostic gaps, NOT evidence of proven final formulas.
import observations from "../pd2/fixtures/character-parity/magizon-screen-observations.json" with { type: "json" };
import { importArmoryAmazon } from "./pd2-armory.js";
import { projectArmoryCharacterSheet } from "./armory-character-sheet.js";
import { projectAmazonRangedAttack } from "./amazon-ranged-attack.js";
import { projectAmazonExtendedInfo } from "./amazon-extended-info.js";
import { bonusForSkill } from "./amazon-comparison.js";

export const PARITY_OBSERVATIONS = observations;
const field = (value,status="unavailable",sources=[],note="")=>({value,status,sources,note});
const source = (path,amount)=>[{path,amount,kind:"raw-snapshot"}];
const chart = (value,sources,note)=>field(value,"partial",sources,note);
const unavailable = reason=>field(null,"unavailable",[],reason);
const valueOrNull = x=>typeof x==="number"&&Number.isFinite(x)?x:null;

export function buildAmazonParityObservations(payload,skills,options={}) {
  if(!payload?.character||!Array.isArray(payload.items))throw new TypeError("Full Armory snapshot required");
  const {weaponSet="main",includeEquipment=true,excludedItemIds=[],includeCharms=true,excludedCharmIds=[]}=options;
  const selected={weaponSet,includeEquipment,excludedItemIds,includeCharms,excludedCharmIds};
  const imported=importArmoryAmazon(payload,skills,selected);
  const build=options.build??imported.build,bonus=options.bonus??imported.bonus;
  const sheet=projectArmoryCharacterSheet(payload,selected);
  const ranged=projectAmazonRangedAttack(payload,skills,build,bonus,selected);
  const info=projectAmazonExtendedInfo(payload,skills,build,bonus,selected).byId;
  const skill=(id)=>{
    const def=skills.find(s=>s.identity.internalId===id);
    if(!def)return unavailable("Skill not found in pinned S14 skill data");
    const hard=build[id]||0,direct=bonus.skills?.[id]||0;
    return field(hard||direct?hard+bonusForSkill(def,bonus):0,"skill-preview",
      [{path:`character.skills[id=${id}]`,amount:hard,kind:"hard-skill-points"},
        ...imported.skillSources.filter(s=>s.target==="all"||s.target==="skill"&&s.key===id||s.target==="tree"&&s.key===Number(def.selected.skillPage))
          .map(s=>({path:s.sourcePath,amount:s.amount,kind:"equipment-skill-bonus"}))],
      "Effective skill from imported hard points and supported equipped +skills; no screenshot inference");
  };
  const raw=(key,v,path)=>v===null||v===undefined?unavailable("Not present in Armory snapshot"):
    field(valueOrNull(v),"raw",source(path,v),"Direct character field; screenshot synchronization not independently verified");
  const attrib=key=>chart(sheet.attributes[key].value,sheet.attributes[key].sources,
    "Base attribute plus selected equipped items only; inventory charms/buffs not applied");
  const stat=(key)=>chart(info[key].equipmentValue,info[key].sources,
    "Selected equipment contribution only; NOT a verified final in-game total");
  const output={
    "skill.multipleShot.level":skill(12),
    "skill.hardSkillCount":field(payload.character.skills.length,"raw",source("character.skills.length",payload.character.skills.length),
      "31 source records include obsolete Avoid and Shattering Arrow, not screenshot active-tree cardinality"),
    "character.level":raw("level",sheet.character.level.value,"character.level"),
    "character.experience":raw("experience",sheet.character.experience.value,"character.experience"),
    "character.nextExperience":unavailable("Next-level XP is not published as a derived game-screen field; native XP table formula not yet sourced"),
    "character.unspentStat":raw("points.stat",sheet.character.unspentStatPoints.value,"character.points.stat"),
    "character.unspentSkill":raw("points.skill",sheet.character.unspentSkillPoints.value,"character.points.skill"),
    "character.strength":attrib("strength"),
    "character.dexterity":attrib("dexterity"),
    "character.vitality":attrib("vitality"),
    "character.energy":attrib("energy"),
    "character.life":raw("life",sheet.resources.life.value,"character.life"),
    "character.mana":raw("mana",sheet.resources.mana.value,"character.mana"),
    "character.stamina":raw("stamina",sheet.resources.stamina.value,"character.stamina"),
    "character.multipleShotDamageMin":chart(ranged.physical.min,
      [...ranged.contributions.offWeaponMin.sources,...ranged.contributions.offWeaponED.sources],
      "Incomplete M6 physical-only estimate: elemental damage, charms, auras and engine order omitted"),
    "character.multipleShotDamageMax":chart(ranged.physical.max,
      [...ranged.contributions.offWeaponMax.sources,...ranged.contributions.offWeaponED.sources],
      "Incomplete M6 physical-only estimate: elemental damage, charms, auras and engine order omitted"),
    "character.magicArrowDamageMin":unavailable("Magic Arrow damage equation and converted damage are not modeled"),
    "character.magicArrowDamageMax":unavailable("Magic Arrow damage equation and converted damage are not modeled"),
    "character.multipleShotAttackRating":unavailable("No independently verified base AR; M6 supports explicit overrides but none are injected into snapshot parity"),
    "character.magicArrowAttackRating":unavailable("Magic Arrow AR and base AR equations unsupported"),
    "character.defense":chart(sheet.defense.knownEquipmentContribution.value,
      sheet.defense.knownEquipmentContribution.sources,
      "Equipment-only defense (no Dexterity defense, charms or active skills)"),
    "character.fireResist":stat("fireResist"),
    "character.coldResist":stat("coldResist"),
    "character.lightResist":stat("lightResist"),
    "character.poisonResist":stat("poisonResist"),
    "extended.baseArDex":unavailable("Dexterity-derived attack rating formula not yet independently verified"),
    "extended.baseArGear":stat("attackRatingFlat"),
    "extended.baseArTotal":unavailable("Cannot compose final base AR without validated Dexterity formula and active charms"),
    "extended.defenseDex":unavailable("Dexterity defense formula and rounding not verified"),
    "extended.defenseGear":chart(sheet.defense.knownEquipmentContribution.value,
      sheet.defense.knownEquipmentContribution.sources,
      "Selected equipment's resolved armor defense + separately traced non-armor defense; charms excluded"),
    "extended.baseOneHandMin":unavailable("Extended-info one-handed baseline not modeled"),
    "extended.baseOneHandMax":unavailable("Extended-info one-handed baseline not modeled"),
    "extended.baseTwoHandMin":unavailable("Extended-info 2h baseline differs from resolved weapon attack stat and needs semantic verification"),
    "extended.baseTwoHandMax":unavailable("Extended-info 2h baseline differs from resolved weapon attack stat and needs semantic verification"),
    "extended.ias":stat("ias"),
    "extended.multipleShotFrames":chart(ranged.speed.frames,ranged.contributions.ias.sources,
      "M6 pinned Amazon A1 model with equipment-only IAS; skill/aura speed and charms excluded"),
    "extended.criticalStrike":field(info.criticalStrike.finalValue,"skill-preview",
      skill(9).sources,"Native S14 passive preview (not yet all final game proc semantics)"),
    "extended.deadlyStrike":stat("deadlyStrike"),
    "extended.crushingBlow":stat("crushingBlow"),
    "extended.openWoundsChance":stat("openWoundsChance"),
    "extended.openWoundsDps":stat("openWoundsDps"),
    "extended.projectilePierce":stat("projectilePierce"),
  };
  const pinned=observations.provenance.armorySnapshot;
  const isPinned=payload.character.name?.toLowerCase()===observations.provenance.observedCharacter.toLowerCase() &&
    payload._obsidianLordsSync?.syncedAt===pinned.syncedAt;
  const baselineConfiguration=weaponSet==="main" && includeEquipment===true &&
    excludedItemIds.length===0 && includeCharms===true && excludedCharmIds.length===0 &&
    options.build===undefined && options.bonus===undefined;
  const charmCandidates=[];
  for(let i=0;i<payload.items.length;i++){
    const item=payload.items[i];
    if(item.location?.zone!=="Stored"||item.location?.storage!=="Inventory"||
      !["scha","mcha","lcha"].includes(item.base?.type_code))continue;
    for(let j=0;j<(item.modifiers||[]).length;j++){
      const mod=item.modifiers[j];
      if(!["strength","item_fasterattackrate","tohit","armorclass"].includes(mod.name)||
        !Array.isArray(mod.values)||mod.values.length!==1||!Number.isFinite(mod.values[0]))continue;
      charmCandidates.push({item:item.name,modifier:mod.name,amount:mod.values[0],
        sourcePath:`items[${i}].modifiers[${j}]`,status:"active-position-charm-source"});
    }
  }
  const candidates={
    "character.strength":"strength",
    "extended.ias":"item_fasterattackrate",
    "extended.baseArGear":"tohit",
    "extended.defenseGear":"armorclass",
  };
  const rows=observations.expectations.map(expect=>{
    const calculated=output[expect.key]??unavailable("Not mapped in M8");
    const expected=expect.observed;
    const eligible=expected!==null&&calculated.value!==null;
    const gap=eligible?calculated.value-expected:null;
    let verdict;
    if(!isPinned)verdict="snapshot-drift";
    else if(!baselineConfiguration)verdict="configuration-drift";
    else if(expected===null)verdict="not-observed";
    else if(calculated.value===null)verdict="unavailable";
    else if(calculated.status==="partial")verdict="partial";
    else verdict=gap===0?"match":"mismatch";
    const evidence=charmCandidates.filter(c=>c.modifier===candidates[expect.key]);
    return {...expect,modeled:calculated.value,modelStatus:calculated.status,
      verdict,numericGap:gap,evidence:calculated.sources,explanation:calculated.note,
      candidateCharmEvidence:evidence,
      candidateReconciles:eligible&&evidence.length>0&&calculated.value===expected&&
        evidence.some(c=>calculated.sources.some(source=>source.path===c.sourcePath))};
  });
  const counts=Object.fromEntries(["match","mismatch","partial","unavailable","not-observed","snapshot-drift","configuration-drift"]
    .map(v=>[v,rows.filter(row=>row.verdict===v).length]));
  return {schemaVersion:1,reference:observations.reference,pinned:isPinned,baselineConfiguration,
    expectedSnapshot:pinned.syncedAt,actualSnapshot:payload._obsidianLordsSync?.syncedAt||null,
    weaponSet,counts,rows,
    charmCandidates,unobservedSkillRows:skills.filter(s=>s.identity.internalId!==18&&s.identity.internalId!==365)
      .map(s=>({id:s.identity.internalId,name:s.identity.internalName,modeled:skill(s.identity.internalId).value,
        screenshotValue:s.identity.internalId===12?21:null})),
    caveats:[
      "The original screenshots are transcribed, not stored in this repo and not timestamp-synchronized to the snapshot",
      "Only the main weapon set, all active charms, all original equipped gear and no manual build/bonus changes are comparable to this reference",
      "A partial model's numericGap is an observational difference, not a proven calculation error",
      "Only position-verified bottom four-row charms are active by default; unusual unique-charm limits remain unsupported",
      "Derived fields cannot be declared matched solely because a partial subtotal equals a screenshot reading",
    ]};
}
