import test from "node:test";
import assert from "node:assert/strict";
import { multishotProcScenario } from "../../src/multishot-procs.js";

test("independent eligible hits use the same per-hit chance", () => {
  const result = multishotProcScenario(25, 20);
  assert.equal(result.expectedApplications, 5);
  assert.ok(Math.abs(result.atLeastOnePercent - 99.6222101517) < .001);
});
test("zero chance, zero hits, certain chance and bounds", () => {
  assert.deepEqual(multishotProcScenario(0, 30), {expectedApplications:0,atLeastOnePercent:0});
  assert.deepEqual(multishotProcScenario(25, 0), {expectedApplications:0,atLeastOnePercent:0});
  assert.deepEqual(multishotProcScenario(1, 100), {expectedApplications:1,atLeastOnePercent:100});
  assert.throws(() => multishotProcScenario(26, 20), RangeError);
  assert.throws(() => multishotProcScenario(1, -1), RangeError);
});
