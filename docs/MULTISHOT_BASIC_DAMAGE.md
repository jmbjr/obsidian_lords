# Multiple Shot basic physical damage and accuracy (experimental Season 14 preview)

This small scenario module is separate from item parsing, attack speed, shot collisions and secondary proc mechanics. It uses manually entered, already calculated bow damage and base AR to show a per-arrow physical damage range and a target-dependent hit chance.

## Pinned source

- [S14 `Skills.txt`](https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/game-data/pd2/season-14/Skills.txt): Multiple Shot `calc1=min(25,ln12)`, `Param1=5`, `Param2=1`; `calc4=ln56`, `Param5=50`, `Param6=4`; `ToHit=8` and `LevToHit=6`; `SrcDam=128`.
- [S14 damage calculation test](https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/utils/damage-calculator.test.ts): expected per-arrow damage multiplier in simple weapon-only fixtures, arrow count and ED at levels 1/20/25/40.
- [S14 `effective-damage.ts`](https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/utils/effective-damage.ts): `chanceToHit` implementation uses 111× AR ratio, truncated integer steps and diminishing excess beyond 95%, with 5–100% final clamp; hit data adds skill + other AR percent before target defense/block evaluation.

## Calculation boundary

At effective skill level L:

- Arrow count `min(25, L+4)`.
- Skill-enhanced physical damage `50+4*(L-1)`%; skill AR `8+6*(L-1)`%.
- Entered bow min/max are the **already calculated weapon damage values**; source-derived skill ED is added to a manually supplied “other applicable off-weapon ED” total, which may include Dexterity, auras and other ED, and applied to both endpoints.
- Entered base AR is the rating **before** percent AR bonuses. Skill AR% is added to manually entered other percent AR (e.g., Penetrate, auras, equipment) before one integer-truncated AR adjustment.
- Hit chance uses the pinned source implementation, comparing calculated AR to entered monster defense and attacker/monster levels. A manual target block percentage is applied afterward. This is **not** projectile contact probability.
- An opt-in checkbox feeds the **arithmetic mean of the pre-strike physical range** into the existing per-target combat-effects scenario. It does **not** infer landed hits from arrow count or target accuracy.

The manually entered values are **not** extracted item stats. The preview does not model on-weapon ED decomposition, flat damage assembly, bonuses to demons/undead, target defense reduction/ignore defense, armor penetration, dodge/avoid states, physical resistance, monster-specific flags, target count, collision geometry or firing cadence. Users must not interpret `arrows × physical damage` as single-target damage or `hitChance × arrows` as guaranteed successful hits. The selectable mean is not an actual final min/max distribution model and can be refined when full equipment/monster inputs exist.

This is a bounded step toward [build optimization #48](https://github.com/jmbjr/obsidian_lords/issues/48), not a full build recommendation or DPS engine.
