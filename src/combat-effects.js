// Reusable Season 14 combat-effect primitives. Deliberately independent of skills,
// projectiles, equipment selection, and attack cadence.
// Source: coleestrin/pd2-tools @ 7952f34719aa3a5cb41334a91fe36dbcbdd8be9c
// api/src/utils/effective-damage.ts and api/src/utils/target-damage.ts.
// Expected values are scenarios, not independent verification of PD2 realm-server behavior.
const clamp = (value, lo, hi) => Math.max(lo, Math.min(hi, value));
const finite = (name, value, min = 0, max = Infinity) => {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name} must be finite and between ${min} and ${max}`);
  }
  return value;
};
const percent = (name, value) => finite(name, value, 0, 100) / 100;

// The source treats skill Critical Strike as taking priority over Deadly Strike.
// Deadly Strike's effective outcome chance is conditional on not critting;
// the two outcomes do not multiply each other.
export function strikeOutcomes({ criticalChance = 0, deadlyChance = 0, criticalMultiplier = 2, deadlyMultiplier = 2 } = {}) {
  const critical = percent("criticalChance", criticalChance);
  const deadly = percent("deadlyChance", deadlyChance);
  finite("criticalMultiplier", criticalMultiplier, 0);
  finite("deadlyMultiplier", deadlyMultiplier, 0);
  const effectiveDeadly = (1 - critical) * deadly;
  const normal = (1 - critical) * (1 - deadly);
  return {
    normalChance: normal,
    criticalChance: critical,
    effectiveDeadlyChance: effectiveDeadly,
    expectedPhysicalMultiplier: normal + critical * criticalMultiplier + effectiveDeadly * deadlyMultiplier,
  };
}

// An already-landed eligible CB attempt. This is current-life damage BEFORE
// subsequent life changes from other hits. Resistance is an effective CB-specific
// resistance supplied by the caller, not automatically equipment pierce.
export function crushingBlowOnHit({
  chance = 0, currentLife, targetType = "ordinary", players = 1,
  ranged = false, efficiencyBonus = 0, effectivePhysicalResistance = 0,
  missingLifePercent = 0, mapBoss = false,
} = {}) {
  const p = percent("chance", chance);
  finite("currentLife", currentLife);
  finite("players", players, 1);
  if (!Number.isInteger(players)) throw new RangeError("players must be an integer");
  finite("missingLifePercent", missingLifePercent, 0, 100);
  finite("efficiencyBonus", efficiencyBonus, -100);
  finite("effectivePhysicalResistance", effectivePhysicalResistance, -100, 100);
  if (!["ordinary","primeEvil"].includes(targetType)) throw new RangeError("Unknown targetType");
  const denominator = targetType === "primeEvil"
    ? (mapBoss ? 30 : 70 + Math.trunc(missingLifePercent) * 10)
    : 8;
  const effectiveDenominator = (denominator + (players - 1) * 1.4) * (ranged ? 1.5 : 1);
  const damageOnProc = currentLife / effectiveDenominator
    * Math.max(0, 1 + efficiencyBonus / 100)
    * Math.max(0, 1 - effectivePhysicalResistance / 100);
  return { chance: p, damageOnProc, expectedDamagePerLandedHit: p * damageOnProc, effectiveDenominator };
}

// Bleed per stack in the cited PD2 source. Damage is an estimated per-second
// contribution, not an instantaneous on-hit packet or a verified server tick.
export function openWoundsDamagePerStack({
  attackerLevel, flatBonus = 0, effectivePhysicalResistance = 0,
} = {}) {
  finite("attackerLevel", attackerLevel, 1);
  if (!Number.isInteger(attackerLevel)) throw new RangeError("attackerLevel must be integer");
  finite("flatBonus", flatBonus, -Infinity);
  finite("effectivePhysicalResistance", effectivePhysicalResistance, -100, 100);
  const l = attackerLevel;
  const base = 9 * Math.min(l - 1, 14)
    + 18 * clamp(l - 15, 0, 15)
    + 27 * clamp(l - 30, 0, 15)
    + 36 * clamp(l - 45, 0, 15)
    + 45 * Math.max(0, l - 60);
  const mitigated = Math.trunc((base + 25 + 5 * flatBonus) * Math.max(0, 1 - effectivePhysicalResistance / 100));
  return Math.max(0, mitigated * 25 / 256);
}

// Source-inspired five-second steady-window estimate, capped at THREE stacks.
// Trials are eligible landed attacks on ONE target in that window. Fractional
// trials use the upstream model's one-extra-trial interpolation.
export function openWoundsWindow({ landedHits = 0, chance = 0, damagePerStack = 0 } = {}) {
  finite("landedHits", landedHits);
  const p = percent("chance", chance);
  finite("damagePerStack", damagePerStack);
  const n = Math.floor(landedHits);
  const fraction = landedHits - n;
  const q = 1 - p;
  const base = [
    Math.pow(q, n),
    n ? n * p * Math.pow(q, n - 1) : 0,
    n > 1 ? n * (n - 1) / 2 * p * p * Math.pow(q, n - 2) : 0,
  ];
  const zero = base[0] * (1 - fraction * p);
  const one = base[1] * (1 - fraction * p) + base[0] * fraction * p;
  const two = base[2] * (1 - fraction * p) + base[1] * fraction * p;
  const expectedStacks = clamp(3 - 3 * zero - 2 * one - two, 0, 3);
  return {
    expectedApplications: landedHits * p,
    atLeastOnePercent: 100 * (1 - zero),
    expectedActiveStacks: expectedStacks,
    estimatedBleedDps: expectedStacks * damagePerStack,
    windowSeconds: 5,
    stackCap: 3,
  };
}
