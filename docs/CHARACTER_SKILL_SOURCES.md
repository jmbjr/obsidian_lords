# Character reconstruction M3 — equipment skill-source resolver

This PR implements roadmap #1 section 2A milestone 3: map **source-confirmed Amazon +skill modifiers** from the normalized equipment graph into the existing A/B skill-bonus model. No damage/AR/stat reconstruction, new equipment UI, inventory-charm guesswork or automatic oskill activation is added.

## Observed PD2 Armory tuples (published snapshots)

| Source | Modifier and tuple | Applied scope |
| --- | --- | --- |
| Magizon, Harmony in **main right hand slot 4** | `item_singleskill [32, 6]`, label `+6 to Valkyrie (Amazon Only)` | Direct +6 to skill ID 32, **not** six allocated hard points |
| Magizon, Amulet (shared slot 2) | `item_addclassskills [0, 1]` | +1 Amazon class skills |
| Magiknaab, Peace (shared armor slot 3) | `item_addclassskills [0, 1]`; `item_singleskill [9, 2]` | +1 Amazon skills and +2 Critical Strike |
| Magiknaab, Ashwood Bow in **alternate right hand slot 11** | `item_addclassskills [0, 2]`; `item_addskill_tab [0, 2]` labeled Bow and Crossbow (Amazon Only) | +2 Amazon skills; +2 Bow & Crossbow skill tree when the alternate set is chosen |
| Magiknaab, Undead Crown | `item_nonclassskill [69, 6]` and `[70, 6]` | Preserved as **unresolved** (Skeleton Mastery/Raise Skeleton; not Amazon class skills) |

### Resolution boundaries

- Default weapon set is **main 4/5**. Selecting **switch 11/12** in the resolver replaces *only* the two hand slots; shared armor and jewelry remain active. M4 will add independent A/B weapon-set selectors and per-item toggles.
- Input goes through `normalizeArmoryEquipment` and `selectEquipmentSources`. Only active **top-level resolved parent modifiers** can produce bonuses; socket child modifiers are not counted again. Mercenary gear, inactive weapon sets and unresolved inventory charms are not counted as player skill bonuses.
- Recognized `item_addclassskills` accepts Amazon class code 0. `item_singleskill` must match an Amazon skill ID and carry the class-specific `Amazon Only` label, to avoid silently assigning arbitrary skill IDs. `item_addskill_tab` requires a matched tab index **and** an Amazon-specific label; unsupported labels/tabs remain unresolved. `item_nonclassskill`/oskills, non-Amazon classes and malformed values are preserved and reported rather than treated as Amazon skill points.
- Each applied contribution has the original item and modifier source path, slot, tuple and target scope; unknown skill tuples appear as `unresolvedSkillModifiers`. Original snapshot and modifier records are retained.
- Consistent with the **existing** sandbox convention, a direct +individual skill bonus can make a zero-hard-point skill available; +class and +tree alone do not activate one. This interpretation is a **model assumption to validate against the game's actual effective skill UI**. Hard-point allocations remain independent of effective levels and do not change during equipment import.
- An imported build receives **resolved** equipment bonuses in the existing `bonus` structure once, not a second bonus layer stacked on already imported stats. Reimport replaces that structure rather than adding duplicates. Manually edited bonuses remain separate scratch state until a more complete source-layer UI exists. Bonuses from charms or another active set are **not** silently added to the current set.
- In `importArmoryAmazon(payload,skills,{weaponSet})`, the recognized weapon is now taken from the selected right-hand slot (4 or 11). The recognized non-skill combat stats use the selected active gear set, but **aren't yet connected** to the combat calculator.

## First parity check

With published Magizon data, the resolver should give **0 Valkyrie hard points, +6 direct Valkyrie from Harmony and +1 class skills from Amulet**, producing **effective Valkyrie level 7** under the current direct-grant convention. Swapping to alternate Hellcast removes Harmony's +6 grant while preserving Amulet's +1; with zero hard points, effective Valkyrie becomes 0.

With Magiknaab, the alternate Ashwood Bow grants +2 class skills and +2 Bow & Crossbow skills that the main Edge bow does not. Peace's +1 Amazon skills and +2 Critical Strike remain active with either set.

These results are from the two published Armory snapshots and existing preview evaluator, **not** independently verified in-game skill level screenshots. The screenshot's exact Valkyrie effective level should be checked during parity validation; don't assume the item's +6 independently verifies all possible stacking/activation rules.

## Milestone 4 dependency

The UI must expose two weapon sets **per Build A/B**. A player can select main/alternate independently without changing shared equipment. The selected gear should drive the skill resolver and all future damage/AR/IAS calculations, and per-item inclusion/exclusion must recompute bonuses without altering raw snapshots or hard points.

No user-facing equipment toggles in this PR; the existing import currently defaults to main set and shows recognized skill bonus totals in the skill tree. 
