import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const result = spawnSync(process.execPath, ["pd2/scripts/normalize-poison-strike.mjs"], { encoding: "utf8" });
assert.equal(result.status, 0, result.stderr);

const path = join("pd2", "generated", "poison-strike.json");
const first = await readFile(path, "utf8");
const data = JSON.parse(first);

assert.equal(data.schemaVersion, 1);
assert.deepEqual(data.identity, {
  internalName: "Poison Dagger",
  internalId: 73,
  classCode: "nec",
  descriptionKey: "poison dagger",
  displayNameStringKey: "skillname73_PD2",
});
assert.equal(data.source.season, 13);
assert.equal(data.source.commit, "ff6ebbbf5510bd68cdd343b2d460a4bdd91609c4");
assert.equal(data.selected.requiredLevel, 1);
assert.equal(data.selected.maxLevel, 20);
assert.equal(data.selected.rangeCode, "h2h");
assert.deepEqual(data.selected.allowedItemTypeCodes, ["knif", "sc9"]);
assert.equal(data.selected.elementTypeCode, "pois");
assert.equal(data.raw.skill.calc1, "\"min(ln12, 50)\"");
assert.equal(data.raw.skill["*calc1 desc"], "poison pierce");
assert.equal(data.raw.skill.EDmgSymPerCalc, "(skill('Desecrate'.blvl)+skill('Bone Armor'.blvl))*par8");
assert.equal(data.raw.description.desccalca4, "-\"min(ln12, 50)\"");

const secondRun = spawnSync(process.execPath, ["pd2/scripts/normalize-poison-strike.mjs"], { encoding: "utf8" });
assert.equal(secondRun.status, 0, secondRun.stderr);
const second = await readFile(path, "utf8");
assert.equal(second, first, "normalization output must be deterministic");

console.log("Poison Strike normalization fixture passed");
