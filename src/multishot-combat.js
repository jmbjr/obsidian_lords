import { strikeOutcomes, crushingBlowOnHit, openWoundsDamagePerStack, openWoundsWindow } from "./combat-effects.js";

// A per-target landed-hit *scenario*. Does not infer collisions or assume
// that multiple arrows can strike one monster during one Multiple Shot volley.
export function multipleShotTargetScenario({
  landedHitsInWindow = 0, physicalDamagePerHit = 0,
  criticalChance = 0, deadlyChance = 0, crushingChance = 0,
  openWoundsChance = 0, currentTargetLife = 10000, attackerLevel = 1,
  targetType = "ordinary", players = 1, effectivePhysicalResistance = 0,
} = {}) {
  if (!Number.isFinite(landedHitsInWindow) || landedHitsInWindow < 0) throw new RangeError("Invalid landed hits");
  if (!Number.isFinite(physicalDamagePerHit) || physicalDamagePerHit < 0) throw new RangeError("Invalid physical damage");
  const strike = strikeOutcomes({ criticalChance, deadlyChance });
  const crushing = crushingBlowOnHit({
    chance: crushingChance, currentLife: currentTargetLife,
    targetType, players, ranged: true, effectivePhysicalResistance,
  });
  const woundPerStack = openWoundsDamagePerStack({
    attackerLevel, effectivePhysicalResistance,
  });
  const wounds = openWoundsWindow({
    landedHits: landedHitsInWindow, chance: openWoundsChance,
    damagePerStack: woundPerStack,
  });
  return {
    strike,
    crushing,
    wounds,
    // Scenario totals are intentionally kept separate, not labeled DPS.
    expectedPhysicalDamage: landedHitsInWindow * physicalDamagePerHit * strike.expectedPhysicalMultiplier,
    expectedCrushingDamageAtFixedLife: landedHitsInWindow * crushing.expectedDamagePerLandedHit,
    windowSeconds: 5,
  };
}
