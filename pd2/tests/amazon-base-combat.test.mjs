import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {amazonDexterityAttackRating,amazonDexterityDefense,baseAmazonCombatStats} from "../../src/amazon-base-combat.js";
import {projectArmoryCharacterSheet} from "../../src/armory-character-sheet.js";
import {importArmoryAmazon} from "../../src/pd2-armory.js";
import {projectAmazonRangedAttack} from "../../src/amazon-ranged-attack.js";
import {projectAmazonExtendedInfo} from "../../src/amazon-extended-info.js";
import {buildAmazonParityObservations} from "../../src/amazon-parity.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
const magizon=load("magizon");
const report=(payload,options={})=>{
  const imp=importArmoryAmazon(payload,skills,options);
  return projectAmazonRangedAttack(payload,skills,imp.build,imp.bonus,options);
};
const info=(payload,options={})=>{
  const imp=importArmoryAmazon(payload,skills,options);
  return projectAmazonExtendedInfo(payload,skills,imp.build,imp.bonus,options).byId;
};
const byKey=p=>Object.fromEntries(p.rows.map(r=>[r.key,r]));
test("Amazon D2-family Dexterity baseline AR and defense formulas have guarded inputs",()=>{
  assert.equal(amazonDexterityAttackRating(60).value,270);
  assert.equal(amazonDexterityDefense(60).value,15);
  assert.equal(amazonDexterityAttackRating(25).value,95);
  assert.equal(amazonDexterityDefense(61).value,15);
  assert.equal(amazonDexterityDefense(63).value,15);
  assert.equal(amazonDexterityDefense(64).value,16);
  assert.equal(amazonDexterityAttackRating(null).value,null);
  assert.equal(amazonDexterityAttackRating(-1).value,null);
  assert.equal(amazonDexterityDefense(12.5).value,null);
  assert.equal(baseAmazonCombatStats(null,53,386).attackRating.value,null);
});
test("Magizon four baseline AR/defense terms and totals exactly match transcribed screenshot",()=>{
  const p=projectArmoryCharacterSheet(magizon);
  assert.equal(p.attributes.dexterity.value,60);
  assert.equal(p.attackRating.fromDexterity.value,270);
  assert.equal(p.attackRating.flatEquipment.value,53);
  assert.equal(p.attackRating.baseTotal.value,323);
  assert.equal(p.defense.fromDexterity.value,15);
  assert.equal(p.defense.knownEquipmentContribution.value,386);
  assert.equal(p.defense.unmodified.value,401);
  assert.equal(p.attackRating.final.value,null);
  assert.equal(p.defense.final.value,null);
  assert.equal(p.attackRating.baseTotal.status,"partial");
  assert.ok(p.attackRating.baseTotal.sources.some(x=>x.path.includes("items[")));
  assert.ok(p.defense.unmodified.sources.some(x=>x.path.includes("items[")));
  const extended=info(magizon);
  assert.equal(extended.baseAttackRating.finalValue,323);
  assert.equal(extended.baseDefenseDexterity.finalValue,15);
  assert.equal(extended.unmodifiedDefense.finalValue,401);
});
test("Missing equipment vs missing charms produce independent, repeatable AR and defense",()=>{
  const base=projectArmoryCharacterSheet(magizon,{includeCharms:false});
  assert.equal(base.attackRating.baseTotal.value,313);
  assert.equal(base.defense.unmodified.value,382);
  const onlyCharms=projectArmoryCharacterSheet(magizon,{includeEquipment:false});
  assert.equal(onlyCharms.attackRating.flatEquipment.value,10);
  assert.equal(onlyCharms.defense.knownEquipmentContribution.value,19);
  assert.equal(onlyCharms.attackRating.baseTotal.value,230);
  assert.equal(onlyCharms.defense.unmodified.value,31);
  const noGear=projectArmoryCharacterSheet(magizon,{includeEquipment:false,includeCharms:false});
  assert.equal(noGear.attributes.dexterity.value,50);
  assert.equal(noGear.attackRating.fromDexterity.value,220);
  assert.equal(noGear.attackRating.baseTotal.value,220);
  assert.equal(noGear.defense.fromDexterity.value,12);
  assert.equal(noGear.defense.unmodified.value,12);
  assert.equal(projectArmoryCharacterSheet(magizon).attackRating.baseTotal.value,323);
});
test("Weapon switching changes only supported hand-source contributions; shared charms remain",()=>{
  const main=projectArmoryCharacterSheet(magizon,{weaponSet:"main"});
  const alt=projectArmoryCharacterSheet(magizon,{weaponSet:"switch"});
  assert.equal(main.attributes.dexterity.value,60);
  assert.equal(alt.attributes.dexterity.value,50);
  assert.equal(alt.attackRating.fromDexterity.value,220);
  assert.equal(alt.attackRating.flatEquipment.value,80);
  assert.equal(alt.attackRating.baseTotal.value,300);
  assert.equal(alt.defense.unmodified.value,411);
  assert.equal(main.defense.unmodified.value,401);
});
test("M6 selected skill AR automatically receives Dexterity base but is explicitly partial",()=>{
  const p=report(magizon);
  assert.equal(p.attackRating.baseSource,"dexterity-derived");
  assert.equal(p.attackRating.baseWithoutEquipment,270);
  assert.equal(p.attackRating.value,Math.trunc(323*2.28));
  assert.equal(p.attackRating.status,"partial");
  assert.notEqual(p.attackRating.value,881);
  const override=report(magizon,{baseAttackRatingOverride:280});
  assert.equal(override.attackRating.baseSource,"measured override");
  assert.equal(override.attackRating.value,Math.trunc(333*2.28));
  assert.equal(report(magizon).attackRating.baseWithoutEquipment,270);
});
test("M8 counts now include partial numeric reconciliations without upgrading to full parity",()=>{
  const row=byKey(buildAmazonParityObservations(magizon,skills));
  for(const [key,expected] of [
    ["extended.baseArDex",270],["extended.baseArGear",53],["extended.baseArTotal",323],
    ["extended.defenseDex",15],["extended.defenseGear",386],["character.defense",401]]) {
    assert.equal(row[key].observed,expected,key);
    assert.equal(row[key].modeled,expected,key);
    assert.equal(row[key].numericGap,0,key);
    assert.equal(row[key].verdict,"partial",key);
  }
  assert.equal(row["character.multipleShotAttackRating"].verdict,"partial");
  assert.equal(row["character.multipleShotAttackRating"].modeled,Math.trunc(323*2.28));
  assert.equal(row["character.multipleShotAttackRating"].observed,881);
});
test("No arbitrary AR or defense is fabricated when effective Dexterity is missing",()=>{
  const synthetic={character:{name:"Missing Dex",attributes:{strength:15}},items:[]};
  const p=projectArmoryCharacterSheet(synthetic);
  assert.equal(p.attackRating.fromDexterity.value,null);
  assert.equal(p.attackRating.baseTotal.value,null);
  assert.equal(p.defense.fromDexterity.value,null);
  assert.equal(p.defense.unmodified.value,null);
});
test("UI shows base Dexterity AR/defense and still labels final selected-skill AR partial",()=>{
  const ui=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(ui,/sheet\.attackRating\.fromDexterity\.value/);
  assert.match(ui,/sheet\.defense\.fromDexterity\.value/);
  assert.match(ui,/sheet\.defense\.unmodified\.value/);
  assert.match(ui,/attackProjection\.attackRating\.baseSource/);
});
