import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importArmoryAmazon } from "../../src/pd2-armory.js";
import { projectAmazonRangedAttack } from "../../src/amazon-ranged-attack.js";
import { buildAmazonDebugComparison } from "../../src/amazon-debug-parity.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
const frozenMagizon=JSON.parse(readFileSync("pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json","utf8"));
const magizon=frozenMagizon;
const review=(payload=magizon,settings={},edits={})=>{
  const imported=importArmoryAmazon(payload,skills,settings);
  const build=edits.build??imported.build, bonus=edits.bonus??imported.bonus;
  const attack=projectAmazonRangedAttack(payload,skills,build,bonus,{
    ...settings,baseAttackRatingOverride:edits.baseAttackRatingOverride??null,
  });
  return buildAmazonDebugComparison(payload,skills,build,bonus,settings,attack);
};

test("pinned baseline shows original in-game AR 881 against source-derived 736 with signed -145",()=>{
  const report=review(),ar=report.primary;
  assert.equal(report.referenceAvailable,true);
  assert.equal(report.comparable,true);
  assert.equal(ar.observed,881);
  assert.equal(ar.computed,736);
  assert.equal(ar.delta,-145);
  assert.equal(ar.status,"partial");
  assert.equal(ar.verdict,"partial");
  assert.equal(report.rows.find(row=>row.key==="extended.baseArTotal").computed,323);
  assert.equal(report.rows.find(row=>row.key==="extended.ias").computed,46);
  assert.equal(report.rows.find(row=>row.key==="character.multipleShotDamageMax").observed,890);
  assert.equal(report.rows.find(row=>row.key==="character.multipleShotDamageMax").computed,388);
  assert.ok(report.rows.length>=20);
});

test("per-item provenance is exposed without manufacturing a final status",()=>{
  const r=review();
  const flat=r.rows.find(row=>row.key==="extended.baseArGear");
  assert.equal(flat.observed,53);
  assert.equal(flat.computed,53);
  assert.ok(flat.sources.some(s=>s.amount===10));
  assert.equal(flat.status,"partial");
  assert.equal(flat.verdict,"partial");
  const pierce=r.rows.find(row=>row.key==="extended.projectilePierce");
  assert.equal(pierce.observed,48);
  assert.equal(pierce.computed,26);
  assert.equal(pierce.delta,-22);
  assert.equal(pierce.status,"partial");
  const magicArrow=r.rows.find(row=>row.key==="character.magicArrowAttackRating");
  assert.equal(magicArrow.computed,null);
  assert.equal(magicArrow.delta,null);
});

test("changes to gear, weapon set and skills keep historical comparison clearly invalid",()=>{
  const switched=review(magizon,{weaponSet:"switch"});
  assert.equal(switched.referenceAvailable,true);
  assert.equal(switched.comparable,false);
  assert.equal(switched.primary.observed,881);
  assert.equal(switched.primary.verdict,"reference-not-comparable");
  assert.ok(switched.reasons.some(r=>r.includes("weapon set")));
  const noCharms=review(magizon,{includeCharms:false});
  assert.equal(noCharms.comparable,false);
  assert.ok(noCharms.reasons.some(r=>r.includes("charms")));
  const imported=importArmoryAmazon(magizon,skills);
  const changed={...imported.build,12:imported.build[12]+1};
  const skilled=review(magizon,{}, {build:changed});
  assert.equal(skilled.comparable,false);
  assert.ok(skilled.reasons.some(r=>r.includes("Skill points")));
  assert.equal(skilled.primary.observed,881);
});

test("measured base AR override is reflected in the same trace, but invalidates parity",()=>{
  const custom=review(magizon,{}, {baseAttackRatingOverride:300});
  assert.equal(custom.comparable,false);
  assert.ok(custom.reasons.some(r=>r.includes("override")));
  assert.equal(custom.primary.computed,Math.trunc(353*2.28));
  assert.equal(custom.primary.delta,custom.primary.computed-881);
});

test("different character and source timestamp never claim an official screenshot reading",()=>{
  const other=review(load("magiknaab"));
  assert.equal(other.referenceAvailable,false);
  assert.equal(other.primary.observed,null);
  assert.equal(other.primary.delta,null);
  assert.equal(other.comparable,false);
  const changed=structuredClone(magizon);
  changed._obsidianLordsSync.syncedAt="2026-12-01T00:00:00.000Z";
  const drift=review(changed);
  assert.equal(drift.referenceAvailable,false);
  assert.equal(drift.primary.observed,null);
});

test("Legacy screenshot evidence remains available only as a reproducible historical fixture",()=>{
  assert.equal(magizon.character.level,67);
  assert.equal(magizon._obsidianLordsSync.syncedAt,"2026-11-03T02:39:05.138Z");
  const ui=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(ui,/buildArmoryDebugAudit\(/);
  assert.doesNotMatch(ui,/buildAmazonDebugComparison\(/);
});
