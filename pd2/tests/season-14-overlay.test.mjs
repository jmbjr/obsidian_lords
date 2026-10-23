import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const overlay = JSON.parse(await readFile("pd2/overlays/season-14/poison-strike.json", "utf8"));
const normalized = JSON.parse(await readFile("pd2/generated/poison-strike.json", "utf8"));

assert.equal(overlay.schemaVersion, 1);
assert.equal(overlay.targetSeason, 14);
assert.equal(overlay.target.kind, "skill");
assert.equal(overlay.target.internalId, normalized.identity.internalId);
assert.equal(overlay.target.displayName, "Poison Strike");
assert.equal(overlay.changes.length, 1);

const change = overlay.changes[0];
assert.equal(change.changeType, "behavior");
assert.equal(change.source.type, "patch-note");
assert.equal(change.source.title, "Season 14 Alliance Patch Notes");
assert.equal(change.source.section, "Necromancer > Poison Strike");
assert.match(change.source.quotedText, /poison pierce bonus applying beyond the duration of the attack animation/);
assert.ok(change.source.reference.trim().length > 0, "overlay source reference must not be empty");
assert.equal(change.confidence, "explicit");
assert.equal(change.numericOverride, null);
assert.match(change.statement, /only during the Poison Strike attack animation/);
assert.deepEqual(change.affectedSourceFields, []);
assert.equal(change.affectedMechanic, "poison pierce bonus duration");

assert.equal(normalized.source.season, 13, "overlay must not relabel the normalized source season");
assert.equal(normalized.raw.skill.calc1, "\"min(ln12, 50)\"", "overlay must not replace the S13 poison-pierce formula");

console.log("Season 14 Poison Strike overlay fixture passed");
