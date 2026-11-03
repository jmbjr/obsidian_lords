import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveAmazonEquipmentSkills, effectiveAmazonSkillLevel } from "../../src/amazon-equipment-skills.js";
import { importArmoryAmazon } from "../../src/pd2-armory.js";
import { compareAmazonBuilds } from "../../src/amazon-comparison.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const byId=id=>skills.find(x=>x.identity.internalId===id);
const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));

test("Magizon +6 Valkyrie from equipped Harmony is direct +skill, not a hard point",()=>{
  const payload=load("magizon");
  const main=importArmoryAmazon(payload,skills);
  assert.equal(main.build[32],0);
  assert.equal(main.bonus.all,1);
  assert.equal(main.bonus.skills[32],6);
  assert.equal(main.bonus.trees[1],0);
  const valk=effectiveAmazonSkillLevel(byId(32),main.build,main.bonus);
  assert.equal(valk.hard,0);
  assert.equal(valk.direct,6);
  assert.equal(valk.effective,7);
  assert.equal(valk.granted,true);
  const evidence=main.skillSources.find(x=>x.modifier==="item_singleskill"&&x.key===32);
  assert.ok(evidence);
  assert.equal(evidence.amount,6);
  assert.equal(evidence.slot,4);
  assert.match(evidence.sourcePath,/^items\[\d+\]\.modifiers\[\d+\]$/);
  assert.equal(main.equipmentSelection.weaponSet,"main");
  assert.equal(main.equippedWeapon.name,"Harmony");
});

test("switching Magizon's hand set removes Harmony Valkyrie grant but keeps shared jewelry",()=>{
  const payload=load("magizon");
  const main=importArmoryAmazon(payload,skills,{weaponSet:"main"});
  const switched=importArmoryAmazon(payload,skills,{weaponSet:"switch"});
  assert.equal(main.bonus.skills[32],6);
  assert.equal(switched.bonus.skills[32]||0,0);
  assert.equal(switched.bonus.all,1);
  assert.equal(main.bonus.all,switched.bonus.all);
  assert.equal(switched.build[32],main.build[32]);
  assert.equal(switched.equippedWeapon.name,"Hellcast");
  assert.equal(effectiveAmazonSkillLevel(byId(32),switched.build,switched.bonus).effective,0);
  assert.ok(switched.skillSources.every(x=>![4,5].includes(x.slot)));
});

test("Magiknaab +Amazon, +Critical Strike, and Bow tab bonuses respect selected hand set",()=>{
  const payload=load("magiknaab");
  const main=importArmoryAmazon(payload,skills,{weaponSet:"main"});
  const alt=importArmoryAmazon(payload,skills,{weaponSet:"switch"});
  assert.equal(main.bonus.all,1);
  assert.equal(main.bonus.skills[9],2);
  assert.equal(main.bonus.trees[1],0);
  assert.equal(alt.bonus.all,3);
  assert.equal(alt.bonus.trees[1],2);
  assert.equal(alt.bonus.skills[9],2);
  assert.equal(alt.bonus.trees[2],0);
  assert.equal(alt.bonus.trees[3],0);
  assert.ok(alt.unresolvedSkillModifiers.some(x=>x.modifier==="item_nonclassskill"));
  assert.ok(alt.skillSources.some(x=>x.modifier==="item_addskill_tab"&&x.slot===11));
  assert.ok(alt.skillSources.some(x=>x.modifier==="item_singleskill"&&x.slot===3));
  const rows=compareAmazonBuilds(skills,[main.build,alt.build],[main.bonus,alt.bonus],{skillIds:[12]});
  const arrows=rows.find(x=>x.label.startsWith("Arrow count"));
  assert.ok(arrows.b>=arrows.a);
});

test("gear exclusions are source-filtered; all-off means no item skill bonuses",()=>{
  const payload=load("magizon");
  const full=resolveAmazonEquipmentSkills(payload,skills);
  const harmony=full.selection.activeItems.find(x=>x.name==="Harmony");
  const off=resolveAmazonEquipmentSkills(payload,skills,{includeEquipment:false});
  assert.equal(off.sources.length,0);
  assert.equal(off.bonus.all,0);
  assert.equal(effectiveAmazonSkillLevel(byId(12),{12:0},full.bonus).effective,0);
  const removed=resolveAmazonEquipmentSkills(payload,skills,{excludedItemIds:[harmony.id]});
  assert.equal(removed.bonus.skills[32]||0,0);
  assert.equal(removed.bonus.all,full.bonus.all);
  assert.equal(resolveAmazonEquipmentSkills(payload,skills).bonus.skills[32],6);
});

test("malformed, foreign class or unsupported modifier forms cannot silently grant skills",()=>{
  const payload={character:{name:"FixtureAmazon",class:{id:0},level:20,skills:[]},
    items:[{name:"Fake helm",location:{zone:"Equipped",equipment_id:1},modifiers:[
      {name:"item_addclassskills",values:[1,10],label:"+10 to Sorceress Skills"},
      {name:"item_addskill_tab",values:[0,2],label:"+2 to Some Other Skills"},
      {name:"item_singleskill",values:[32,6],label:"+6 to unknown skill"},
      {name:"item_nonclassskill",values:[32,6],label:"+6 to Valkyrie"},
      {name:"item_singleskill",values:[32,-1],label:"+?"},
    ]}]};
  const r=resolveAmazonEquipmentSkills(payload,skills);
  assert.equal(r.sources.length,0);
  assert.equal(r.unresolved.length,5);
  assert.equal(r.bonus.all,0);
  assert.equal(r.bonus.skills[32]||0,0);
});

test("existing native skill preview observes resolved direct bonus and doesn't mutate imported source",()=>{
  const payload=load("magizon");
  const before=JSON.stringify(payload);
  const imported=importArmoryAmazon(payload,skills);
  const rows=compareAmazonBuilds(skills,[imported.build,imported.build],[imported.bonus,imported.bonus],{skillIds:[32]});
  assert.ok(rows.length>0);
  assert.equal(rows.find(x=>x.label.startsWith("Summon bonus HP"))?.a,42);
  assert.equal(JSON.stringify(payload),before);
});
