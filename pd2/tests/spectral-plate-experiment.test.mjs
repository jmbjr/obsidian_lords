import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const experiment = JSON.parse(await readFile("pd2/experiments/spectral-plate-poison-strike.json", "utf8"));

assert.equal(experiment.schemaVersion, 1);
assert.equal(experiment.id, "spectral-plate-poison-strike");
assert.equal(experiment.season, 14);
assert.equal(experiment.status, "untested");
assert.equal(experiment.result, null);
assert.equal(experiment.questions.length, 5);
assert.ok(experiment.questions.every((question) => question.status === "untested"));
assert.ok(experiment.protocol.length >= 6);
assert.ok(experiment.knownInputs.every((input) => input.confidence === "explicit"));

console.log("Spectral Plate + Poison Strike experiment definition passed");
