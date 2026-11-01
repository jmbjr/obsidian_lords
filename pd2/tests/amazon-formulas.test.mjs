import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { previewAmazonSkill, diminishingDm12, elementalMinByLevel } from "../../src/amazon-formulas.js";
const data = JSON.parse(await readFile("pd2/generated/amazon-skills.json", "utf8"));
const skill = (id) => data.skills.find((item) => item.identity.internalId === id);
assert.deepEqual(previewAmazonSkill(skill(12), 0), []);
assert.equal(previewAmazonSkill(skill(12), 1)[0].value, 5);
assert.equal(previewAmazonSkill(skill(12), 1)[1].value, 50);
assert.equal(previewAmazonSkill(skill(12), 20)[0].value, 24);
assert.equal(previewAmazonSkill(skill(12), 20)[1].value, 126);
assert.equal(previewAmazonSkill(skill(12), 20)[2].value, 122);
assert.equal(previewAmazonSkill(skill(12), 20, 1)[2].value, 128);
assert.equal(previewAmazonSkill(skill(12), 20, 5)[0].value, 25);
assert.equal(previewAmazonSkill(skill(12), 20, 40)[0].value, 25);
assert.equal(previewAmazonSkill(skill(12), 20, 40)[1].value, 286);
assert.equal(previewAmazonSkill(skill(22), 20, 40)[0].value, 320);
assert.equal(previewAmazonSkill(skill(22), 1)[0].value, 25);
assert.equal(previewAmazonSkill(skill(22), 5)[0].value, 45);
assert.equal(previewAmazonSkill(skill(26), 10).length, 2);
const changed = structuredClone(skill(12));
changed.raw.skill.calc1 = "unexpected";
assert.deepEqual(previewAmazonSkill(changed, 5), []);
const alteredHit = structuredClone(skill(12));
alteredHit.raw.skill.ToHit = "unexpected";
assert.equal(previewAmazonSkill(alteredHit,20).length,2);
const magic = skill(6);
assert.equal(previewAmazonSkill(magic, 1, 40, {8:3,17:2,22:4}).find(x=>x.label.includes("synergy")).value, 180);
assert.equal(previewAmazonSkill(magic, 1, 0, {8:3,17:2,22:4}).find(x=>x.label.includes("synergy")).value, 180);
assert.equal(previewAmazonSkill(magic, 0, 40, {8:3,17:2,22:4}).length, 0);
const invalidMagic = structuredClone(magic);
invalidMagic.raw.skill.EDmgSymPerCalc = "unknown";
assert.equal(previewAmazonSkill(invalidMagic, 1, 0, {8:3}).some(x=>x.label.includes("synergy")),false);
const strafe = previewAmazonSkill(skill(26), 10, 40, {23:5});
assert.equal(strafe[0].value, 5);
assert.equal(strafe[1].value, 80 + 49 * 12 + 5 * 10);
assert.equal(previewAmazonSkill(skill(26), 10, 40, {23:0})[1].value, 80 + 49 * 12);
const alteredStrafe = structuredClone(skill(26));
alteredStrafe.raw.skill.calc2 = "unknown";
assert.deepEqual(previewAmazonSkill(alteredStrafe, 10, 0, {23:5}), []);
assert.equal(diminishingDm12(1,5,75),15);
assert.equal(diminishingDm12(20,5,75),63);
assert.equal(diminishingDm12(60,5,75),75);
assert.equal(previewAmazonSkill(skill(9),1)[0].value,15);
assert.equal(previewAmazonSkill(skill(9),20,40)[0].value,75);
// Recovered from PR #24: source-level-band edmn evaluator, not final chance %.
for (const [level,expected] of [[1,20],[8,34],[20,58],[45,85],[60,100]]) {
  assert.equal(elementalMinByLevel(skill(33).raw.skill,level),expected);
  assert.equal(previewAmazonSkill(skill(33),Math.min(level,20),Math.max(level-20,0))[0].value,expected);
}
assert.equal(elementalMinByLevel(skill(33).raw.skill,0),null);
const invalidPierce = structuredClone(skill(33));
invalidPierce.raw.skill.passivecalc1 = "unknown";
assert.deepEqual(previewAmazonSkill(invalidPierce,10),[]);
for (const [id, token] of [[9,"dm12"],[33,"edmn"]]) {
  const result = previewAmazonSkill(skill(id),20,40);
  assert.equal(result[0].value,id === 9 ? 75 : 100);
  assert.equal(result[0].expression,token);
  const altered = structuredClone(skill(id));
  altered.raw.skill.passivecalc1 = "unexpected";
  assert.deepEqual(previewAmazonSkill(altered,20,40),[]);
}
console.log("Source-guarded formula previews passed");

const metricValue = (id, hard, bonus, label, build = {}) => previewAmazonSkill(skill(id),hard,bonus,build).find(x => x.label.includes(label))?.value;
// Fire Arrow native S14 attack rating: source-guarded and based on effective level.
assert.equal(previewAmazonSkill(skill(7),0).length,0);
assert.equal(metricValue(7,1,0,"Attack rating"),10);
assert.equal(metricValue(7,20,0,"Attack rating"),200);
assert.equal(metricValue(7,20,1,"Attack rating"),210);
const changedFire = structuredClone(skill(7));
changedFire.raw.skill.LevToHit = "11";
assert.equal(previewAmazonSkill(changedFire,20).some(x=>x.label.includes("Attack rating")),false);

// Cold Arrow uses the same native S14 ToHit/LevToHit pair as Fire Arrow.
assert.equal(previewAmazonSkill(skill(11),0).length,0);
assert.equal(metricValue(11,1,0,"Attack rating"),10);
assert.equal(metricValue(11,20,0,"Attack rating"),200);
assert.equal(metricValue(11,20,1,"Attack rating"),210);
const changedCold = structuredClone(skill(11));
changedCold.raw.skill.ToHit = "11";
assert.equal(previewAmazonSkill(changedCold,20).some(x=>x.label.includes("Attack rating")),false);

// Broad Bow & Crossbow coverage, native source guards and hard-point synergies.
for (const id of [6,7,11,12,16,21,22,26,27,31]) {
  assert.equal(previewAmazonSkill(skill(id),0).length,0);
  assert.ok(previewAmazonSkill(skill(id),10).length>0,"Missing numeric metrics for bow skill "+id);
}
assert.equal(previewAmazonSkill(skill(7),20).find(x=>x.label.includes("projectile count")).value,8);
assert.equal(previewAmazonSkill(skill(16),20).find(x=>x.label.includes("Cluster bombs")).value,7);
assert.equal(previewAmazonSkill(skill(16),20,20).find(x=>x.label.includes("Explosion radius")).value,8);
assert.equal(previewAmazonSkill(skill(31),20,20).find(x=>x.label.includes("Damage radius")).value,9);
assert.equal(previewAmazonSkill(skill(27),10).find(x=>x.label.includes("Fire disc radius")).value,3);
assert.equal(previewAmazonSkill(skill(11),10,0,{21:3,6:2}).find(x=>x.label.includes("synergy")).value,75);
assert.equal(previewAmazonSkill(skill(27),10,40,{16:3,7:2,6:1}).find(x=>x.label.includes("synergy")).value,30);
assert.equal(previewAmazonSkill(skill(21),10,0,{11:1,31:2,6:3}).find(x=>x.label.includes("synergy")).value,78);
assert.equal(previewAmazonSkill(skill(31),10,0,{21:2,11:3}).find(x=>x.label.includes("synergy")).value,30);
const changedBow = structuredClone(skill(16)); changedBow.raw.skill.calc2="unsupported";
assert.equal(previewAmazonSkill(changedBow,20).some(x=>x.label.includes("Cluster bombs")),false);

// Passive & Magic coverage, including Inner Sight and unresolved evaluator tokens.
for (const id of [8,9,13,17,18,23,28,29,32,33]) {
  assert.deepEqual(previewAmazonSkill(skill(id),0),[]);
  assert.ok(previewAmazonSkill(skill(id),10).length>0,"Missing Passive & Magic preview "+id);
}
assert.equal(previewAmazonSkill(skill(8),1).find(x=>x.label.includes("duration")).value,200);
assert.equal(previewAmazonSkill(skill(8),20).find(x=>x.label.includes("range")).value,29);
assert.equal(previewAmazonSkill(skill(8),40).find(x=>x.label.includes("attack rating reduction")).value,40);
assert.equal(previewAmazonSkill(skill(23),20).find(x=>x.label.includes("Attack rating")).value,225);
assert.equal(previewAmazonSkill(skill(23),20,40).find(x=>x.label.includes("Physical pierce")).value,10);
assert.equal(previewAmazonSkill(skill(32),20).find(x=>x.label.includes("bonus HP")).value,133);
assert.equal(previewAmazonSkill(skill(29),20)[0].value,null);
const alteredSight=structuredClone(skill(8));alteredSight.raw.skill.auralencalc="unknown";
assert.equal(previewAmazonSkill(alteredSight,20).some(x=>x.label.includes("duration")),false);
