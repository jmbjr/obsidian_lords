import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolveAmazonLayout, validateAmazonLayout } from "../../src/amazon-layout.js";
const data = JSON.parse(await readFile("pd2/generated/amazon-skills.json", "utf8"));
assert.equal(data.source.season, 14);
const shot = data.skills.find((skill) => skill.identity.internalId === 12);
assert.equal(shot.identity.internalName, "Multiple Shot");
assert.equal(shot.selected.skillPage, "1");
assert.equal(shot.selected.skillRow, "2");
assert.equal(shot.selected.skillColumn, "2");
const ids = new Set(data.skills.map((skill) => skill.identity.internalId));
assert.equal(ids.size, data.skills.length);
assert.equal(data.skills.length, 31);
assert.ok(validateAmazonLayout(data.skills));
assert.deepEqual([resolveAmazonLayout(data.skills.find(s => s.identity.internalId === 18)).page, resolveAmazonLayout(data.skills.find(s => s.identity.internalId === 18)).row], [2, 1]);
assert.equal(resolveAmazonLayout(data.skills.find(s => s.identity.internalId === 18)).status, "provisional");
assert.equal(resolveAmazonLayout(data.skills.find(s => s.identity.internalId === 365)).page, null);
assert.equal(data.skills.filter(s => resolveAmazonLayout(s).page === null).length, 1);
assert.equal(data.skills.filter(s => resolveAmazonLayout(s).page !== null).length, 30);
for (const skill of data.skills) {
  assert.ok(Number.isInteger(skill.selected.requiredLevel));
  assert.ok(Number.isInteger(skill.selected.maxLevel));
  assert.ok(skill.raw.skill);
  assert.ok(skill.raw.description);
}
console.log("Amazon source-coordinate fixture passed");

import { amazonAllocationIssues, amazonBuildIssues } from "../../src/amazon-comparison.js";
const blank = Object.fromEntries(data.skills.map(s=>[s.identity.internalId,0]));
const issues = (id,build=blank,level=62) => amazonAllocationIssues(data.skills.find(s=>s.identity.internalId===id),build,level,data.skills);
assert.ok(issues(12).some(x=>x.includes("Magic Arrow")));
assert.deepEqual(issues(12,{...blank,6:1}),[]);
assert.ok(issues(12,{...blank,6:1},5).some(x=>x.includes("level 6")));
assert.ok(issues(22,{...blank,12:1}).some(x=>x.includes("Magic Arrow")));
assert.deepEqual(issues(22,{...blank,6:1,12:1}),[]);
assert.ok(issues(13).some(x=>x.includes("Cyclic source prerequisite")));
assert.ok(amazonBuildIssues({...blank,12:20},62,data.skills).some(x=>x.id===12));
