import test from "node:test";
import assert from "node:assert/strict";
import { multipleShotTargetScenario } from "../../src/multishot-combat.js";

test("zero landed hits yields zero physical and CB contributions and OW stacks", () => {
  const r=multipleShotTargetScenario({landedHitsInWindow:0,physicalDamagePerHit:100,crushingChance:50,openWoundsChance:50});
  assert.equal(r.expectedPhysicalDamage,0);
  assert.equal(r.expectedCrushingDamageAtFixedLife,0);
  assert.equal(r.wounds.expectedActiveStacks,0);
});
test("ranged CB and exclusive strike outcomes are combined without claiming DPS", () => {
  const r=multipleShotTargetScenario({
    landedHitsInWindow:2,physicalDamagePerHit:100,
    criticalChance:50,deadlyChance:40,crushingChance:20,
    currentTargetLife:12000,openWoundsChance:100,attackerLevel:55,
  });
  assert.ok(Math.abs(r.expectedPhysicalDamage - 340)<1e-9);
  assert.ok(Math.abs(r.expectedCrushingDamageAtFixedLife - 400)<1e-9);
  assert.equal(r.crushing.effectiveDenominator,12);
  assert.equal(r.wounds.expectedActiveStacks,2);
  assert.equal(r.windowSeconds,5);
});
test("input validation propagates from combat foundation",()=>{
  assert.throws(()=>multipleShotTargetScenario({landedHitsInWindow:-1}),RangeError);
  assert.throws(()=>multipleShotTargetScenario({landedHitsInWindow:1,criticalChance:120}),RangeError);
  assert.throws(()=>multipleShotTargetScenario({physicalDamagePerHit:-1}),RangeError);
});
