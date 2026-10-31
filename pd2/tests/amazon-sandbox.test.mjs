import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const data = JSON.parse(await readFile("pd2/generated/amazon-skills.json", "utf8"));
assert.equal(data.source.season, 14);
const shot = data.skills.find((skill) => skill.identity.internalId === 12);
assert.equal(shot.identity.internalName, "Multiple Shot");
assert.equal(shot.selected.skillPage, "1");
assert.equal(shot.selected.skillRow, "2");
assert.equal(shot.selected.skillColumn, "2");
const ids = new Set(data.skills.map((skill) => skill.identity.internalId));
assert.equal(ids.size, data.skills.length);
for (const skill of data.skills) {
  assert.ok(Number.isInteger(skill.selected.requiredLevel));
  assert.ok(Number.isInteger(skill.selected.maxLevel));
  assert.ok(skill.raw.skill);
  assert.ok(skill.raw.description);
}
console.log("Amazon source-coordinate fixture passed");
