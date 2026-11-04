import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { explainAmazonAttackRating } from "../../src/amazon-ar-explainer.js";
import { importArmoryAmazon } from "../../src/pd2-armory.js";
import { projectAmazonRangedAttack } from "../../src/amazon-ranged-attack.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(name==="magizon"?"pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json":`public/armory/${name}.json`,"utf8"));
const project=(payload,options={})=>{
  const imported=importArmoryAmazon(payload,skills,options);
  return projectAmazonRangedAttack(payload,skills,imported.build,imported.bonus,options);
};

test("Magizon M9c breakdown exactly follows existing M9b 736 partial estimate",()=>{
  const p=project(load("magizon")),b=p.attackRating.breakdown;
  assert.equal(p.attackRating.value,736);
  assert.equal(b.value,p.attackRating.value);
  assert.equal(b.dexterity,60);
  assert.equal(b.derivedFormula,270);
  assert.equal(b.baseAR,270);
  assert.equal(b.baseSource,"dexterity-derived");
  assert.equal(b.flatAR,53);
  assert.equal(b.additiveBase,323);
  assert.equal(b.hardPoints,20);
  assert.equal(b.skillLevel,21);
  assert.equal(b.skillLevelBonus,1);
  assert.equal(b.skillFormula,128);
  assert.equal(b.skillARPercent,128);
  assert.equal(b.gearARPercent,0);
  assert.equal(b.totalPercent,128);
  assert.equal(b.multiplier,2.28);
  assert.equal(b.unrounded,736.4399999999999);
  assert.ok(b.dexSources.some(s=>s.path==="character.attributes.dexterity"));
  assert.ok(b.flatSources.some(s=>s.amount===10&&s.item.includes("Charm")));
  assert.equal(b.percentSources.length,0);
  assert.equal(b.status,"partial");
});

test("measured override changes base AR only, while sources and % remain inspectable",()=>{
  const p=project(load("magizon"),{baseAttackRatingOverride:300});
  const b=p.attackRating.breakdown;
  assert.equal(b.baseSource,"measured override");
  assert.equal(b.derivedFormula,null);
  assert.equal(b.baseAR,300);
  assert.equal(b.flatAR,53);
  assert.equal(b.additiveBase,353);
  assert.equal(b.value,Math.trunc(353*2.28));
  assert.equal(b.value,p.attackRating.value);
});

test("gear/weapon/charm toggles independently recompute trace and preserve raw snapshot",()=>{
  const payload=load("magizon"),before=JSON.stringify(payload);
  const main=project(payload);
  const alternate=project(payload,{weaponSet:"switch"});
  const noCharms=project(payload,{includeCharms:false});
  const noGear=project(payload,{includeEquipment:false});
  assert.equal(main.attackRating.breakdown.flatAR,53);
  assert.equal(noCharms.attackRating.breakdown.flatAR,43);
  assert.equal(alternate.attackRating.breakdown.flatAR,80);
  assert.equal(noGear.attackRating.breakdown.flatAR,10);
  for(const p of [main,alternate,noCharms,noGear]){
    const b=p.attackRating.breakdown;
    assert.equal(b.value,p.attackRating.value);
    assert.equal(b.value,Math.max(0,Math.trunc(b.additiveBase*b.multiplier)));
  }
  assert.equal(JSON.stringify(payload),before);
});

test("unsupported skill or unavailable base AR is transparent, never numeric zero masquerading as parity",()=>{
  const inactive=explainAmazonAttackRating({
    dexterity:60,baseAR:270,flatAR:53,gearARPercent:0,
    skillARPercent:null,skillLevel:0,skillId:12,
  });
  assert.equal(inactive.value,null);
  assert.equal(inactive.status,"unavailable");
  const missing=explainAmazonAttackRating({
    dexterity:null,baseAR:null,flatAR:53,gearARPercent:0,
    skillARPercent:128,skillLevel:21,skillId:12,
  });
  assert.equal(missing.value,null);
  assert.equal(missing.additiveBase,null);
});

test("M9c exposes a real accessible expandable inspector with exact source-derived stages",()=>{
  const ui=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(ui,/data-ar-breakdown/);
  assert.match(ui,/Show full AR calculation/);
  assert.match(ui,/Base AR from Dexterity/);
  assert.match(ui,/Flat AR item sources/);
  assert.match(ui,/Percentage AR item sources/);
  assert.match(ui,/Total modeled AR percentage/);
  assert.match(ui,/ar\.equation/);
  assert.match(ui,/measuredBaseAttackRating\[state\.active\]/);
});
