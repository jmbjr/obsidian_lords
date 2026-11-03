# Character reconstruction M9b — Amazon Dexterity-derived AR and defense

**Scope:** one bounded follow-up to M9 charm activation: derive Amazon base attack rating and Dexterity defense from selected effective Dexterity; compose the *unmodified* base AR and defense from M5 equipped gear and position-validated inventory charms; report partial, traceable selected-skill AR without claiming full Season 14 combat parity.

## Sources and mathematical evidence

The classical Diablo II rules are documented by [The Amazon Basin attack rating reference](https://www.theamazonbasin.com/wiki/index.php/Attack_Rating) and [Arreat Summit character basics](https://classic.battle.net/Diablo2exp/basics/characters.shtml). The attack rating reference gives `baseAR = 5 × (Dexterity − 7) + classConstant`, with the Amazon class constant `+5`. This simplifies to **`baseAR = 5 × effectiveDexterity − 30`**. The defense reference gives **`DexterityDefense = floor(effectiveDexterity / 4)`**. These are *D2-family* formulas, not a claim that all PD2 S14 buff/skill/server calculations are identical.

The independently transcribed **PD2 screenshot for Magizon** validates the *base* outcomes on the pinned character snapshot when M9's active inventory charms are included:

| Source-backed field | Model | Screenshot | Evidence |
| --- | ---: | ---: | --- |
| Effective Dexterity | 60 | 60 | Armory base 50 + Harmony +10, selected lower-half charms included |
| Dexterity base AR | **270** | **270** | `5 × 60 − 30` |
| Flat equipped+active charm AR | **53** | **53** | M5 native `tohit` sources, including +10 charm (M9) |
| **Unmodified base AR** | **323** | **323** | 270 + 53 |
| Dexterity defense | **15** | **15** | `floor(60/4)` |
| Equipped+active charm defense | **386** | **386** | M5 resolved armor + non-armor `armorclass` and active charms |
| **Unmodified defense baseline** | **401** | **401** | 15 + 386 |

The screenshot/model agreement across **both independent equations** is considerably stronger than tuning formulas to a final damage/AR number. Nevertheless, screenshot capture and Armory sync timestamps are not independently proven identical. These fields remain **partial/source-derived** rather than full engine parity.

## API and controls

- `src/amazon-base-combat.js`: pure, guarded `amazonDexterityAttackRating()`, `amazonDexterityDefense()`, and `baseAmazonCombatStats()`. Inputs are **effective** Dexterity and traced selected flat AR/defense contributions. Missing or invalid Dexterity returns `null`, not zero or an invented class stat.
- `projectArmoryCharacterSheet`: exposes `attackRating.fromDexterity`, `attackRating.baseTotal`, `defense.fromDexterity` and `defense.unmodified`, with source lists and formulas. Existing `attackRating.final` and `defense.final` remain unavailable where auras, percentage defense and passive/skill effects are unknown.
- M7 **Extended Info (8)**: displays the composed unmodified base AR, Dexterity defense and unmodified defense rows while preserving source breakdowns and unsupported final categories.
- M6 Multiple Shot: derives its default base AR from the source-backed Dexterity equation. A separately measured **manual base-AR override** is still supported and identified. The selected-skill AR forecast combines base AR, selected flat AR, skill AR percent and known equipment AR percent as a **partial estimate**—*not* a verified PD2 final formula.
- M8 fixed 42-field matrix: scores the six screenshot AR/defense components (including total character defense 401) as **partial numeric reconciliations**. The selected Multiple Shot AR estimate now returns a number but remains **partial** because it is not yet 881 in the screenshot.
- As in earlier M9 work, **Build A/B** may independently select main hands 4/5 or alternate hands 11/12. All shared non-hand gear and both builds' separately selected eligible inventory charms remain intact; master gear/charm toggles independently recompute the base outputs.

## What's intentionally unfinished

The in-game screenshot shows **Multiple Shot attack rating 881**. The basic partial forecast is `floor(323 × 2.28) = 736` for Magizon at effective Multiple Shot 21, not 881. That discrepancy is **not** resolved by inventing a flat 145 AR bonus or changing the well-supported base formula. Remaining candidates include AR% from passives, additional game-specific skill multipliers, conditional weapon modifiers, formula order and screenshot/snapshot synchronization. The final `attackRating.final` field remains unsupported until those rules are sourced.

The screenshot also includes Magic Arrow **529 AR**, which still needs a distinct skill-specific model. Final character defense may differ from its unmodified 401 baseline with percent/skill/aura effects, running state or curses; the baseline happens to equal the pinned screenshot.

**Next bounded investigations:** (1) source and regression-test passive/weapon AR percentage and exact selected-skill AR stacking; (2) source passive projectile Pierce skill, aiming at 48% in-game versus 26% item Pierce; (3) source Open Wounds +165 DPS and final physical/elemental damage conversion, including Magic Arrow. Keep each independently testable; avoid declaring total three-screen parity based on numeric coincidence.
