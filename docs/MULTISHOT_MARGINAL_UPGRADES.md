# Multiple Shot marginal effect upgrades — exploratory optimization

Scope: one-target **five-second landed-hit scenario** already available in the Multiple Shot inspector. All changes are independently applied to the *same* inputs and rerun through [the shared combat-effect model](../src/combat-effects.js) via [per-target Multiple Shot composition](../src/multishot-combat.js). This does not invent a collision model or simulate item inventory.

| Upgrade | Change in inputs | Reported effect |
| --- | --- | --- |
| +1 Critical Strike hard point | Uses [source-guarded dm12 Amazon passive](../src/amazon-critical-strike.js) on a hypothetical extra skill point if actual build has room, budget, and passes skill gates; available only with automatic Build CS enabled | Δ physical damage over entered hits |
| +10 percentage points Deadly Strike | Increments manually entered DS, capped at 100% | Δ physical damage over entered hits, conditional on existing CS |
| +10 percentage points Crushing Blow | Increments entered CB, capped at 100% | Δ CB expected damage over entered hits at **fixed** target life |
| +10 percentage points Open Wounds chance | Increments entered OW chance, capped at 100% | Δ steady five-second-window bleed **per second** and expected stacks |
| +10 Open Wounds Damage Per Second | Increments separate gear stat consumed by source bleed formula | Δ per-stack bleed magnitude and steady bleed **per second**, with expected stack count unchanged |

The UI presents **distinct units**, not one aggregated score: expected physical damage and CB damage over the entered landed hits, and estimated OW steady bleed per second. OW chance controls how often stacks apply; the separate `Open Wounds Damage Per Second` equipment property increases the modeled per-stack magnitude via the pinned source formula (it is **not** added literally as +10 final DPS). OW amount contributes no damage if no bleed is applied. CB is current-life-dependent and the fixed-life scenario overstates sequential repeated CB opportunities. OW is capped at 3 stacks per target. None of these compare actual item opportunity costs, attack cadence, target count, sustained DPS, or safety/control effects.

**A +1 skill point and +10% item affix are not comparable investments by default.** These are marginal response / sensitivity experiments and do not imply an upgrade is obtainable or free. Gear-dependent affix tradeoffs, constraints and A/B builds come later in [build optimization issue #48](https://github.com/jmbjr/obsidian_lords/issues/48).

Unresolved S14 all-arrow effect eligibility, per-projectile rolls, Pierce, hit opportunities and target overlap remain *explicit modeling assumptions*, not established realm-server rules. See [combat-effects foundation](./COMBAT_EFFECTS.md) for pinned Season 14 sources.
