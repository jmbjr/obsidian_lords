# Character Reconstruction M4 — Equipment and Weapon Set Controls

This implements master roadmap #1 section 2A, milestone 4: independent source-backed equipment controls per imported Amazon build. It builds on M2 source graph and M3 skill-source resolver. It intentionally does **not** assert that weapon damage/AR/IAS/defense/resistances are calculated from these controls yet; those calculations belong to M5–M7.

## Calculator usage

1. Load an official Armory snapshot into Build A or Build B (via published GitHub sync, paste, or local JSON).
2. An **Equipment** section appears for the selected build. **Include all equipment** is checked initially; **Main (hands 4/5)** is the default weapon set.
3. Select **Alternate (hands 11/12)** to swap only weapon/shield/quiver hand slots. Helm, armor, amulet, rings, belt, gloves and boots remain active and unchanged.
4. Uncheck one or more individual items to exclude their mapped +skill contributions, or clear **Include all equipment** to suppress all mapped equipment skill bonuses. Restoring selections recomputes from the original immutable source; never compounds prior results.
5. Import another character into the other Build and configure it independently. A/B comparisons, skill tree levels, build-derived Critical Strike and skill previews receive updated effective bonuses without changing hard points.

## Model rules

- `src/amazon-equipment-controls.js` calculates *fresh* source bonuses from `resolveAmazonEquipmentSkills(payload,skills,settings)`. The resulting effective bonus is the sum of two distinct layers: manually entered scratch bonuses and currently selected equipment-derived bonuses (bounded by existing normalized bonus limits). The computed effective bonus is **never** used as an input to the next recomputation.
- Item selections are identified by source paths `items[n]` for the **current imported snapshot**. Switching loadouts changes eligibility of 4/5 vs 11/12 only. The exclusions remain stored within the current build even when their items are temporarily in the inactive set.
- Each Build A/B has separate memory-backed original source data, `weaponSet`, `includeEquipment`, `excludedItemIds`, and separate manual bonus layer.
- Reimporting a character **replaces** its source and resets that build's equipment selections to all included and main set; manual scratch bonuses for that build reset to zero. The other build is unaffected.
- The UI labels each alternate item as an inactive weapon-set item unless its set is selected. An unchecked item stays excluded even if switching away and back. When the master toggle is off, individual checkbox choices are kept so they can be restored later.
- All imported source JSON remains **session-only** (as established in M3). To avoid accidentally persisting equipment bonuses without the backing source, local storage saves the **manual layer only** while a source is attached. Reopening the site requires reloading snapshots to restore equipment effects. Existing copy/export JSON remains a **flattened skill bonus snapshot** (not raw inventory/gear), so loading that JSON deliberately detaches any previously imported live gear sources.
- Unknown skill modifiers, socket children, charms and mercenary gear stay subject to M2/M3 exclusion/verification rules. No duplicate socket bonus calculations. Unmapped item stat effects are preserved but not applied.
- The shared character-level and skill-point-budget limitations remain from the original sandbox; the imported snapshot is per Build A/B, but the total `level` and `budget` are shared. Full independent character-sheet reconstruction is a later milestone.

## Regression coverage

`pd2/tests/amazon-equipment-controls.test.mjs` covers both published Armory characters, two-set behavior with shared gear, selective all/off/item filtering, source immutability, independent A/B setup, idempotent recomputation and manual-bonus isolation. UI wiring is smoke-checked; verify checkbox/selector behavior in-browser after merge.

Next: M5 character-sheet primitives and clear field-by-field source contribution breakdowns. Do not claim that toggling gear currently recalculates physical damage/AR/IAS; those remain manual combat scenario inputs until the source-grounded derived-stat implementations land.
