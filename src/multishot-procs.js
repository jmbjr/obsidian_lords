// Exploratory probability model, not a verified PD2 server proc implementation.
// A trial is one confirmed eligible hit, potentially on a DIFFERENT target.
export function multishotProcScenario(hits, chancePercent) {
  if (!Number.isInteger(hits) || hits < 0 || hits > 25) throw new RangeError("hits must be 0–25");
  if (!Number.isFinite(chancePercent) || chancePercent < 0 || chancePercent > 100) throw new RangeError("chance must be 0–100");
  const p = chancePercent / 100;
  return {
    expectedApplications: hits * p,
    atLeastOnePercent: 100 * (1 - (1 - p) ** hits),
  };
}
