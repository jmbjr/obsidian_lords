import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildAmazonParityObservations, PARITY_OBSERVATIONS } from "../../src/amazon-parity.js";
import { defaultEquipmentSettings } from "../../src/amazon-equipment-controls.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const frozenMagizon=JSON.parse(readFileSync("pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json","utf8"));
const magizon=frozenMagizon,get=report=>Object.fromEntries(report.rows.map(row=>[row.key,row]));

test("original screenshot expectations stay frozen and source snapshot identity is pinned",()=>{
  const p=buildAmazonParityObservations(magizon,skills);
  assert.equal(p.pinned,true);
  assert.equal(p.actualSnapshot,PARITY_OBSERVATIONS.provenance.armorySnapshot.syncedAt);
  assert.equal(PARITY_OBSERVATIONS.provenance.screenshots.length,5);
  assert.equal(PARITY_OBSERVATIONS.expectations.length,42);
  assert.equal(p.rows.length,42);
  assert.equal(new Set(p.rows.map(x=>x.key)).size,42);
  assert.ok(p.rows.every(x=>Object.hasOwn(x,"numericGap")&&Object.hasOwn(x,"explanation")&&Object.hasOwn(x,"evidence")));
});

test("matched sourced measurements do not grant unsupported parity credit",()=>{
  const r=get(buildAmazonParityObservations(magizon,skills));
  assert.equal(r["character.level"].verdict,"match");
  assert.equal(r["character.experience"].verdict,"match");
  assert.equal(r["character.unspentStat"].verdict,"match");
  assert.equal(r["skill.multipleShot.level"].modeled,21);
  assert.equal(r["skill.multipleShot.level"].verdict,"match");
  assert.equal(r["extended.criticalStrike"].modeled,23);
  assert.equal(r["extended.criticalStrike"].verdict,"match");
  assert.equal(r["character.dexterity"].modeled,60);
  assert.equal(r["character.dexterity"].verdict,"partial");
  assert.equal(r["character.dexterity"].numericGap,0);
  assert.equal(r["character.stamina"].modeled,1313);
  assert.equal(r["character.stamina"].observed,1312);
  assert.equal(r["character.stamina"].verdict,"mismatch");
});

test("four verified-position charm contributions reconcile four M8 gaps, without upgrading partial status",()=>{
  const r=get(buildAmazonParityObservations(magizon,skills));
  const cases=[
    ["character.strength",65,65,6],
    ["extended.ias",46,46,6],
    ["extended.baseArGear",53,53,10],
    ["extended.defenseGear",386,386,19],
  ];
  for(const [key,modeled,observed,charmSum] of cases){
    const row=r[key];
    assert.equal(row.modeled,modeled,key);
    assert.equal(row.observed,observed,key);
    assert.equal(row.verdict,"partial",key);
    assert.equal(row.numericGap,modeled-observed,key);
    assert.equal(row.candidateCharmEvidence.reduce((s,c)=>s+c.amount,0),charmSum,key);
    assert.equal(row.candidateReconciles,true,key);
    assert.ok(row.candidateCharmEvidence.every(c=>c.status==="active-position-charm-source"));
  }
  assert.equal(r["extended.multipleShotFrames"].modeled,10);
  assert.equal(r["extended.multipleShotFrames"].observed,10);
  assert.equal(r["extended.multipleShotFrames"].verdict,"partial");
  assert.equal(r["extended.projectilePierce"].modeled,26);
  assert.equal(r["extended.projectilePierce"].observed,48);
  assert.equal(r["extended.openWoundsDps"].modeled,0);
  assert.equal(r["extended.openWoundsDps"].observed,165);
  assert.equal(r["extended.openWoundsDps"].verdict,"partial");
});

test("unavailable calculations are explicitly null, not zero or false matches",()=>{
  const r=get(buildAmazonParityObservations(magizon,skills));
  const unmodeled=["character.nextExperience","character.magicArrowDamageMin",
    "character.magicArrowDamageMax",
    "character.magicArrowAttackRating",
    "extended.baseOneHandMin",
    "extended.baseTwoHandMax"];
  for(const key of unmodeled){
    assert.equal(r[key].modeled,null,key);
    assert.equal(r[key].numericGap,null,key);
    assert.equal(r[key].verdict,"unavailable",key);
  }
  assert.equal(r["extended.deadlyStrike"].modeled,0);
  assert.equal(r["extended.deadlyStrike"].verdict,"partial");
  assert.equal(r["extended.deadlyStrike"].candidateReconciles,false);
});

test("all playable source skills are enumerated, even those without screenshot readings",()=>{
  const p=buildAmazonParityObservations(magizon,skills);
  assert.equal(p.unobservedSkillRows.length,29);
  assert.equal(p.unobservedSkillRows.find(s=>s.id===12).screenshotValue,21);
  assert.equal(p.unobservedSkillRows.find(s=>s.id===32).screenshotValue,null);
  assert.ok(!p.unobservedSkillRows.some(s=>s.id===18||s.id===365));
  assert.equal(get(p)["skill.hardSkillCount"].verdict,"not-observed");
});

test("snapshot drift fails closed, switches never rewrite screenshot observations",()=>{
  const original=JSON.stringify(magizon);
  const drift=structuredClone(magizon);
  drift._obsidianLordsSync.syncedAt="2026-12-01T00:00:00.000Z";
  const out=buildAmazonParityObservations(drift,skills);
  assert.equal(out.pinned,false);
  assert.equal(out.counts["snapshot-drift"],42);
  const base=buildAmazonParityObservations(magizon,skills,{...defaultEquipmentSettings(),weaponSet:"main"});
  const swapped=buildAmazonParityObservations(magizon,skills,{...defaultEquipmentSettings(),weaponSet:"switch"});
  assert.equal(base.pinned,true);
  assert.equal(swapped.pinned,true);
  assert.equal(swapped.baselineConfiguration,false);
  assert.equal(swapped.counts["configuration-drift"],42);
  assert.equal(get(base)["extended.ias"].modeled,46);
  const noCharms=buildAmazonParityObservations(magizon,skills,{...defaultEquipmentSettings(),includeCharms:false});
  assert.equal(noCharms.baselineConfiguration,false);
  assert.equal(noCharms.counts["configuration-drift"],42);
  assert.equal(get(swapped)["extended.ias"].modeled,106);
  assert.equal(get(base)["extended.ias"].observed,get(swapped)["extended.ias"].observed);
  assert.equal(JSON.stringify(magizon),original);
});

test("parity framework does not promote candidates or forecasts into validated game stats",()=>{
  const p=buildAmazonParityObservations(magizon,skills);
  const r=get(p);
  assert.equal(r["character.multipleShotDamageMin"].modeled,142);
  assert.equal(r["character.multipleShotDamageMax"].modeled,388);
  assert.equal(r["character.multipleShotDamageMin"].verdict,"partial");
  assert.equal(r["character.multipleShotDamageMax"].verdict,"partial");
  assert.equal(r["character.multipleShotDamageMax"].numericGap,388-890);
  assert.ok(p.caveats.some(x=>x.includes("not a proven calculation error")));
});
