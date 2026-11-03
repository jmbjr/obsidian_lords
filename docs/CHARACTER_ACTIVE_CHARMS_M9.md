# Character Reconstruction M9 — position-verified PD2 active charms

**Scope:** first bounded M9 slice following M8 (#63): activate only verified-position inventory charms, add independently selectable per-build charm controls, and recompute existing skills/stats/attacks/Extended Info. M9 does **not** complete all missing PD2 combat formulas or declare full three-screen parity.

## PD2 active charm rules and evidence

PD2 uses an enlarged **10-column × 8-row** inventory, with a separate active charm region in the **bottom four rows**. The top rows (0–3) hold items but do not activate charm bonuses; charms must fit **entirely** within rows 4–7. This has been repeatedly confirmed by PD2 players, including:

- [PD2 community: charm window explanation (2023)](https://www.reddit.com/r/ProjectDiablo2/comments/185tyz9)
- [PD2 community: lower four rows and overflow restriction (2025)](https://www.reddit.com/r/ProjectDiablo2/comments/1mlq60a)
- [PD2 community: half inventory behavior (2022)](https://www.reddit.com/r/ProjectDiablo2/comments/ys6qxh)

**Source-schema verification:** Armory `items[].location.zone="Stored"`, `storage="Inventory"`, `items[].position.row/column`, and `base.type_code` expose enough information to identify item position. We use zero-based positions (validated by both published character snapshots). Standard charm heights: `scha` 1, `mcha` 2, `lcha` 3, width 1.

`pd2CharmCells(item)` returns:
- `active-position`: correct item/base/storage and valid, fully contained bottom-row placement
- `inactive-position`: any part outside lower grid, including top-half or out-of-bounds
- `unverified-position`: missing or noninteger position data
- `not-charm`: anything outside the scoped charm type.

The graph also checks **cell occupancy**; overlapping records are rejected with a provenance warning, not double-counted. A disabled charm continues to reserve its grid footprint, preventing an invalid second item from becoming active merely because its checkbox is off.

Unique charms (Annihilus/Torch/Gheed) and any special activation/quantity limits **require separate source validation** before extending this rule. M9 supports only the three standard charm base codes actually found in the published test snapshots. An unknown type remains inactive; the importer never guesses based on item name.

## User controls

For each imported Build A/B, master **Include eligible inventory charms** defaults **on** separately from **Include all equipment**. Each eligible charm has its own checkbox. Exclusions remain anchored to source-path IDs in the active snapshot, reset on reimport, and do not mutate raw Armory JSON.

**Weapon swapping changes only hand slots 4/5 ↔ 11/12.** The same charm array contributes to either set and remains selected independently per Build A/B. Disabling all equipped gear does **not** disable charms; disabling charms does **not** disable armor/rings/weapons. Both settings recompute independently. Supported charm modifier sources are first-class `selection.activeSources`, with `selection.activeItems` still meaning equipped gear, and `selection.activeCharms` meaning eligible active inventory charms. M2's socketed-child no-double-counting and mercenary isolation remain enforced.

## Reconstructed M8 parity targets

On Magizon's pinned snapshot, all 23 standard charms occupy rows 4–7 without collisions. Source-driven default projections now reproduce four independently observed screen quantities:

| Field | Equipped-only M8 | Active charms applied M9 | Screenshot |
| --- | ---: | ---: | ---: |
| Strength | 59 | **65** (+6 `Grand Charm of Strength`) | 65 |
| IAS | 40 | **46** (+6 `Quick Large Charm of Blight`) | 46 |
| Flat equipment AR | 43 | **53** (+10 `Fine Grand Charm of Balance`) | 53 |
| Equipment defense | 367 | **386** (+1 `Stout Small Charm of Anthrax`; +18 `Burly Small Charm of Balance`) | 386 |
| Multiple Shot frames | 11 | **10** (pinned Amazon A1 model at 46 IAS) | 10 |

These are source-grounded **numeric reconciliations**; the original five screenshots and Armory sync are not independently timestamp-synchronized. In `src/amazon-parity.js`, these numbers remain `partial` until the final game-stat calculation is verified; no incomplete estimate is silently reclassified as a full parity match. M8's fixed comparison now requires **default active charms** as part of its matching configuration. Excluding even one charm invalidates the original screenshot comparison (`configuration-drift`), just as changing weapon sets does.

Charm-derived damage ranges, resistances, hit recovery and other supported modifiers also flow into M5–M7; original equipped-only regression baselines remain available by explicitly setting `includeCharms:false`. Note that M6 off-weapon damage now includes applicable charm flat damage, but the final screenshot mismatch still needs independent formula work.

## Regression and limitations

`pd2/tests/amazon-active-charms.test.mjs` checks both published sources, every active charm position, overflow and upper-row rejection, overlapping records, master/item controls, independent hand swapping, no graph mutation, M8 reconciliations and the known 10-frame breakpoint.

- No automatic activation of **stash**, **cube**, upper-half inventory items, offhand weapon-set items, or **mercenary equipment**.
- No unsupported base/unique charm or special item type is treated as a normal active charm.
- Current tooltip, stat and in-game effective-value discrepancies remain separately tracked: passive Pierce, OW DPS, selected-skill final damage/AR, Magic Arrow conversion, runtime buffs and caps.
- Source-path item IDs can change after importing a new snapshot; per-build charm exclusions reset on fresh import rather than silently applying to the wrong item.
- The new M9 grid rule is community-supported and confirmed by the observed JSON item positions. A synchronized in-game verification can further strengthen confidence in edge cases (including mixed item/charm placement and unusual unique charms).

**Next bounded work after M9:** re-run the 42-field M8 matrix, then prioritize source-verified native formulas for base AR/defense, Pierce passive, physical/elemental damage, OW DPS and Magic Arrow; keep remaining fields explicitly unavailable until supported.
