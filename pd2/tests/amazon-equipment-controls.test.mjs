import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defaultEquipmentSettings, resolveEquipmentBuild, combineSkillBonuses } from "../../src/amazon-equipment-controls.js";
import { emptyBonus, compareAmazonBuilds } from "../../src/amazon-comparison.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
// Original M4 weapon/amulet assertions must use the archived gear loadout.
const load=name=>JSON.parse(readFileSync(name==="magizon"?"pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json":`public/armory/${name}.json`,"utf8"));

test("default gear is included and Valkyrie item grant is recomputed from immutable snapshot",()=>{
  const magizon=load("magizon");
  const before=JSON.stringify(magizon);
  const selected=defaultEquipmentSettings();
  const initial=resolveEquipmentBuild(magizon,skills,emptyBonus(),selected);
  assert.equal(initial.bonus.all,1);
  assert.equal(initial.bonus.skills[32],6);
  assert.equal(initial.selection.weaponSet,"main");
  const alternate=resolveEquipmentBuild(magizon,skills,emptyBonus(),{...selected,weaponSet:"switch"});
  assert.equal(alternate.bonus.all,1);
  assert.equal(alternate.bonus.skills[32]||0,0);
  assert.equal(resolveEquipmentBuild(magizon,skills,emptyBonus(),selected).bonus.skills[32],6);
  assert.equal(JSON.stringify(magizon),before);
});

test("weapon switch leaves shared gear intact while swapping all hand modifiers",()=>{
  const magiknaab=load("magiknaab");
  const main=resolveEquipmentBuild(magiknaab,skills);
  const alt=resolveEquipmentBuild(magiknaab,skills,emptyBonus(),{...defaultEquipmentSettings(),weaponSet:"switch"});
  assert.equal(main.bonus.all,1);
  assert.equal(alt.bonus.all,3);
  assert.equal(main.bonus.skills[9],2);
  assert.equal(alt.bonus.skills[9],2);
  assert.equal(main.bonus.trees[1],0);
  assert.equal(alt.bonus.trees[1],2);
  const mainShared=main.selection.activeItems.filter(x=>x.scope==="shared-equipped").map(x=>x.id);
  const altShared=alt.selection.activeItems.filter(x=>x.scope==="shared-equipped").map(x=>x.id);
  assert.deepEqual(mainShared,altShared);
});

test("individual exclusion and include-equipment master control recompute, not just hide",()=>{
  const payload=load("magizon");
  const withGear=resolveEquipmentBuild(payload,skills);
  const bow=withGear.selection.activeItems.find(x=>x.name==="Harmony");
  const amulet=withGear.selection.activeItems.find(x=>x.slot===2);
  const noBow=resolveEquipmentBuild(payload,skills,emptyBonus(),{weaponSet:"main",includeEquipment:true,excludedItemIds:[bow.id]});
  assert.equal(noBow.bonus.skills[32]||0,0);
  assert.equal(noBow.bonus.all,1);
  const noAmulet=resolveEquipmentBuild(payload,skills,emptyBonus(),{weaponSet:"main",includeEquipment:true,excludedItemIds:[amulet.id]});
  assert.equal(noAmulet.bonus.all,0);
  assert.equal(noAmulet.bonus.skills[32],6);
  const allOff=resolveEquipmentBuild(payload,skills,emptyBonus(),{weaponSet:"main",includeEquipment:false,excludedItemIds:[]});
  assert.equal(allOff.bonus.all,0);
  assert.equal(allOff.bonus.skills[32]||0,0);
  assert.equal(allOff.selection.activeItems.length,0);
});

test("manual skill layer is separate and stable under gear toggles, avoiding duplicate bonuses",()=>{
  const payload=load("magizon");
  const manual={all:2,trees:{1:3,2:1,3:0},skills:{32:4,12:1}};
  const main=resolveEquipmentBuild(payload,skills,manual);
  assert.equal(main.bonus.all,3);
  assert.equal(main.bonus.skills[32],10);
  assert.equal(main.bonus.trees[1],3);
  const alt=resolveEquipmentBuild(payload,skills,manual,{weaponSet:"switch",includeEquipment:true,excludedItemIds:[]});
  assert.equal(alt.bonus.all,3);
  assert.equal(alt.bonus.skills[32],4);
  const off=resolveEquipmentBuild(payload,skills,manual,{weaponSet:"main",includeEquipment:false,excludedItemIds:[]});
  assert.equal(off.bonus.all,2);
  assert.equal(off.bonus.skills[32],4);
  const again=resolveEquipmentBuild(payload,skills,manual);
  assert.deepEqual(again.bonus,main.bonus);
  assert.equal(manual.all,2);
  assert.equal(manual.skills[32],4);
});

test("separately imported builds keep independent weapon settings in A/B calculations",()=>{
  const a=load("magizon"),b=load("magiknaab");
  const settingsA={weaponSet:"main",includeEquipment:true,excludedItemIds:[]};
  const settingsB={weaponSet:"switch",includeEquipment:true,excludedItemIds:[]};
  const bonusA=resolveEquipmentBuild(a,skills,emptyBonus(),settingsA).bonus;
  const bonusB=resolveEquipmentBuild(b,skills,emptyBonus(),settingsB).bonus;
  assert.equal(bonusA.skills[32],6);
  assert.equal(bonusB.skills[32]||0,0);
  assert.equal(bonusA.all,1);
  assert.equal(bonusB.all,3);
  const points=Object.fromEntries(skills.map(x=>[x.identity.internalId,0]));
  const rows=compareAmazonBuilds(skills,[{...points,12:20},{...points,12:20}],[bonusA,bonusB],{skillIds:[12]});
  assert.ok(rows.some(x=>x.label.startsWith("Damage modifier") && x.b>x.a));
});

test("manual combining bounds known bonus fields and ignores unsupported skill keys",()=>{
  const a={all:95,trees:{1:99},skills:{32:99,"99999":42}};
  const b={all:10,trees:{1:5},skills:{32:6}};
  const sum=combineSkillBonuses(a,b,skills);
  assert.equal(sum.all,100);
  assert.equal(sum.trees[1],100);
  assert.equal(sum.skills[32],100);
  assert.equal(sum.skills[99999],undefined);
});

test("UI has independent gear selectors, per-item switches and source-layer controls",()=>{
  const code=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(code,/data-equipment-set/);
  assert.match(code,/data-equipment-all/);
  assert.match(code,/data-equipment-item/);
  assert.match(code,/equipmentSettings\[state\.active\]/);
  assert.match(code,/manualBonuses\[index\]/);
  assert.match(code,/recomputeGear\(state\.active\)/);
  assert.match(code,/renderAmazonSandbox/);
});
