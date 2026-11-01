import test from "node:test";
import assert from "node:assert/strict";
import { strikeOutcomes, crushingBlowOnHit, openWoundsDamagePerStack, openWoundsWindow } from "../../src/combat-effects.js";

test("Critical Strike and Deadly Strike are mutually exclusive, not additive", () => {
  const s = strikeOutcomes({criticalChance:50,deadlyChance:40});
  assert.equal(s.criticalChance,.5);
  assert.equal(s.effectiveDeadlyChance,.2);
  assert.ok(Math.abs(s.normalChance-.3)<1e-12);
  assert.equal(s.expectedPhysicalMultiplier,1.7);
  assert.equal(strikeOutcomes({criticalChance:100,deadlyChance:100}).expectedPhysicalMultiplier,2);
  assert.equal(strikeOutcomes().expectedPhysicalMultiplier,1);
});
test("Crushing Blow scales with target current life, hit mode and boss type", () => {
  const base={chance:20,currentLife:12000};
  const melee=crushingBlowOnHit(base);
  assert.equal(melee.effectiveDenominator,8);
  assert.equal(melee.damageOnProc,1500);
  assert.equal(melee.expectedDamagePerLandedHit,300);
  assert.equal(crushingBlowOnHit({...base,ranged:true}).damageOnProc,1000);
  assert.equal(crushingBlowOnHit({...base,players:2}).effectiveDenominator,9.4);
  assert.equal(crushingBlowOnHit({...base,targetType:"primeEvil",missingLifePercent:20}).effectiveDenominator,270);
  assert.equal(crushingBlowOnHit({...base,targetType:"primeEvil",mapBoss:true}).effectiveDenominator,30);
  assert.equal(crushingBlowOnHit({...base,efficiencyBonus:50,effectivePhysicalResistance:50}).damageOnProc,1125);
  assert.equal(crushingBlowOnHit({...base,chance:0}).expectedDamagePerLandedHit,0);
});
test("Open Wounds level bands, cap and five-second window", () => {
  const bleed=openWoundsDamagePerStack({attackerLevel:1});
  assert.equal(bleed, Math.trunc(25)*25/256);
  assert.equal(openWoundsDamagePerStack({attackerLevel:16}), (Math.trunc((9*14+18+25))*25)/256);
  const one=openWoundsWindow({landedHits:1,chance:100,damagePerStack:bleed});
  assert.equal(one.expectedActiveStacks,1);
  assert.equal(one.estimatedBleedDps,bleed);
  assert.equal(openWoundsWindow({landedHits:100,chance:100,damagePerStack:bleed}).expectedActiveStacks,3);
  assert.equal(openWoundsWindow({landedHits:0,chance:100,damagePerStack:bleed}).expectedActiveStacks,0);
  const half=openWoundsWindow({landedHits:.5,chance:100});
  assert.equal(half.expectedActiveStacks,.5);
  assert.equal(openWoundsWindow({landedHits:3,chance:50}).expectedApplications,1.5);
});
test("Invalid inputs fail rather than silently creating plausible results", () => {
  assert.throws(()=>strikeOutcomes({deadlyChance:120}),RangeError);
  assert.throws(()=>crushingBlowOnHit({chance:20,currentLife:-1}),RangeError);
  assert.throws(()=>crushingBlowOnHit({chance:20,currentLife:1,players:1.5}),RangeError);
  assert.throws(()=>openWoundsDamagePerStack({attackerLevel:0}),RangeError);
  assert.throws(()=>openWoundsWindow({landedHits:-1}),RangeError);
});
