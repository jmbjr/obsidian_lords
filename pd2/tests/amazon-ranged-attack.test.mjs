import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { projectAmazonRangedAttack, pd2AmazonRangedFrames } from "../../src/amazon-ranged-attack.js";
import { importArmoryAmazon } from "../../src/pd2-armory.js";
import { resolveEquipmentBuild } from "../../src/amazon-equipment-controls.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
const projected=(payload,options={})=>{
  const {baseAttackRatingOverride=null,...gear}=options;
  const imported=importArmoryAmazon(payload,skills,gear);
  const effective=resolveEquipmentBuild(payload,skills,undefined,gear);
  return projectAmazonRangedAttack(payload,skills,imported.build,effective.bonus,{...gear,baseAttackRatingOverride});
};

test("Magizon source-traced Multiple Shot damage excludes already-resolved bow local ED",()=>{
  const payload=load("magizon"),baseline=JSON.stringify(payload);
  const p=projected(payload);
  assert.equal(p.skillId,12);
  assert.equal(p.effective,21);
  assert.equal(p.skillED,130);
  assert.equal(p.skillAR,128);
  assert.deepEqual([p.weapon.physical.min,p.weapon.physical.max],[39,104]);
  assert.equal(p.weapon.baseCode,"8sb");
  assert.equal(p.contributions.offWeaponMin.value,4);
  assert.equal(p.contributions.offWeaponMax.value,10);
  assert.equal(p.contributions.offWeaponED.value,42);
  assert.equal(p.contributions.dexterity.value,60);
  assert.deepEqual([p.physical.min,p.physical.max],[142,378]);
  assert.ok(p.contributions.offWeaponED.sources.every(x=>x.slot!==4));
  assert.equal(p.attackRating.status,"unavailable");
  assert.equal(p.attackRating.value,null);
  assert.equal(JSON.stringify(payload),baseline);
});

test("selected hand set changes weapon, IAS, AR contributions and selected skill damage",()=>{
  const p=load("magizon");
  const main=projected(p,{weaponSet:"main"});
  const other=projected(p,{weaponSet:"switch"});
  assert.equal(main.weapon.name,"Harmony");
  assert.equal(other.weapon.name,"Hellcast");
  assert.equal(main.contributions.ias.value,40);
  assert.equal(other.contributions.ias.value,100);
  assert.equal(main.contributions.flatAttackRating.value,43);
  assert.equal(other.contributions.flatAttackRating.value,70);
  assert.equal(other.contributions.dexterity.value,50);
  assert.notDeepEqual([main.physical.min,main.physical.max],[other.physical.min,other.physical.max]);
  assert.notEqual(main.speed.frames,other.speed.frames);
});

test("independent measured base AR enables a clearly conditional skill AR estimate",()=>{
  const payload=load("magizon");
  const p=projected(payload,{baseAttackRatingOverride:270});
  assert.equal(p.attackRating.status,"partial");
  assert.equal(p.attackRating.baseWithoutEquipment,270);
  assert.equal(p.attackRating.value,Math.trunc((270+43)*2.28));
  assert.throws(()=>projected(payload,{baseAttackRatingOverride:-1}),/override/);
  assert.throws(()=>projected(payload,{baseAttackRatingOverride:2.5}),/override/);
});

test("master gear off and per-item exclusion recompute all selected attack inputs",()=>{
  const payload=load("magizon");
  const base=projected(payload);
  const item=resolveEquipmentBuild(payload,skills).selection.activeItems.find(x=>x.slot===5);
  const minus=projected(payload,{excludedItemIds:[item.id]});
  assert.equal(minus.contributions.offWeaponMax.value,0);
  assert.equal(minus.contributions.offWeaponED.value,23);
  assert.equal(minus.contributions.ias.value,20);
  assert.equal(minus.contributions.flatAttackRating.value,0);
  assert.ok(minus.physical.max<base.physical.max);
  const off=projected(payload,{includeEquipment:false});
  assert.equal(off.contributions.ias.value,0);
  assert.equal(off.contributions.offWeaponED.value,0);
  assert.equal(off.weapon.physical.status,"unavailable");
  assert.equal(off.physical.min,null);
});

test("PD2 specific animation table computes frames from pinned EIAS/WSM instead of fixed breakpoints",()=>{
  const bow=pd2AmazonRangedFrames({ias:40,weaponCode:"8sb"});
  assert.equal(bow.wsm,5);
  assert.equal(bow.animation,"bow");
  assert.equal(bow.eias,30);
  assert.equal(bow.frames,11);
  const crossbow=pd2AmazonRangedFrames({ias:100,weaponCode:"hxb"});
  assert.equal(crossbow.wsm,10);
  assert.equal(crossbow.animation,"xbw");
  assert.ok(Number.isInteger(crossbow.frames));
  assert.ok(crossbow.frames>0);
  assert.equal(pd2AmazonRangedFrames({ias:10,weaponCode:"unknown"}).frames,null);
  assert.throws(()=>pd2AmazonRangedFrames({ias:-1,weaponCode:"8sb"}),/IAS/);
});

test("unsupported skills, absent weapons, and unknown base codes fail transparent",()=>{
  const p=load("magiknaab");
  const miss=projected(p,{skillId:6});
  // Helper imports Multiple Shot build but target skill resolver is directly
  // called with an optional selection to ensure Magic Arrow isn't mis-modeled.
  const imported=importArmoryAmazon(p,skills);
  const alt=projectAmazonRangedAttack(p,skills,imported.build,imported.bonus,{skillId:6});
  assert.equal(alt.physical.min,null);
  assert.equal(alt.skillED,null);
  assert.equal(alt.attackRating.value,null);
  assert.equal(miss.physical.status,"partial");
});

test("M6 UI is wired to selected imported A/B gear, and manual combat assumptions remain manual",()=>{
  const ui=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(ui,/projectAmazonRangedAttack\(/);
  assert.match(ui,/baseAttackRatingOverride:measuredBaseAttackRating\[state\.active\]/);
  assert.match(ui,/data-armory-base-ar/);
  assert.match(ui,/M6 imported attack projection/);
  assert.match(ui,/combat inputs remain manual/);
});
