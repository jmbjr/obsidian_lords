import { multipleShotTargetScenario } from "./multishot-combat.js";

// Compare equal-sized *hypothetical* changes against the same scenario.
// Returns separate physical/CB damage-over-window and OW bleed-per-second
// differences; do not sum across these units or declare a universal winner.
export function compareMarginalEffects({
  landedHitsInWindow = 0, physicalDamagePerHit = 0,
  criticalChance = 0, deadlyChance = 0, crushingChance = 0,
  openWoundsChance = 0, openWoundsDamagePerSecond = 0, currentTargetLife = 10000,
  attackerLevel = 1, nextHardPointCriticalChance = null,
  targetType = "ordinary", players = 1, effectivePhysicalResistance = 0,
} = {}) {
  const common = {
    landedHitsInWindow, physicalDamagePerHit,
    criticalChance, deadlyChance, crushingChance, openWoundsChance, openWoundsDamagePerSecond,
    currentTargetLife, attackerLevel, targetType, players,
    effectivePhysicalResistance,
  };
  const baseline = multipleShotTargetScenario(common);
  const metrics = result => ({
    physicalDamage: result.expectedPhysicalDamage,
    crushingDamageAtFixedLife: result.expectedCrushingDamageAtFixedLife,
    openWoundsBleedDps: result.wounds.estimatedBleedDps,
    openWoundsExpectedStacks: result.wounds.expectedActiveStacks,
  });
  const baseMetrics = metrics(baseline);
  const changes = [
    { id: "critical", label: "+1 Critical Strike hard point",
      valid: nextHardPointCriticalChance !== null,
      update: { criticalChance: nextHardPointCriticalChance } },
    { id: "deadly", label: "+10 percentage points Deadly Strike",
      valid: true, update: { deadlyChance: Math.min(100, deadlyChance + 10) } },
    { id: "crushing", label: "+10 percentage points Crushing Blow",
      valid: true, update: { crushingChance: Math.min(100, crushingChance + 10) } },
    { id: "wounds", label: "+10 percentage points Open Wounds chance",
      valid: true, update: { openWoundsChance: Math.min(100, openWoundsChance + 10) } },
    { id: "woundDamage", label: "+10 Open Wounds Damage Per Second",
      valid: true, update: { openWoundsDamagePerSecond: openWoundsDamagePerSecond + 10 } },
  ];
  return {
    baseline: baseMetrics,
    changes: changes.map(change => {
      if (!change.valid) return { id: change.id, label: change.label, available: false, reason: "No eligible additional Critical Strike hard point" };
      const after = { ...common, ...change.update };
      const result = multipleShotTargetScenario(after);
      const next = metrics(result);
      return {
        id: change.id, label: change.label, available: true,
        beforeChance: common[Object.keys(change.update)[0]],
        afterChance: after[Object.keys(change.update)[0]],
        delta: Object.fromEntries(Object.keys(next).map(key => [key, next[key] - baseMetrics[key]])),
        after: next,
      };
    }),
  };
}
