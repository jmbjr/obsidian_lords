# Character Debug Comparison — captured screenshot versus current model

This is a targeted review aid, not a new PD2 damage or AR formula.

Open the Amazon sandbox, import Magizon, and find **Ranged attack → Attack rating**. A compact reference strip displays **Screenshot: 881**, **Calculated: 736**, and the signed modeled-minus-observed **Δ: −145** under the pinned M9b/M9c configuration. The observation is a **historical in-game screenshot transcription**, not a live official Armory stat API field.

Expand **Debug · compare screenshot vs calculated values** to see Multiple Shot AR, base AR constituents, Multiple Shot physical minimum and maximum, skill level, attack frames/IAS, defense, Pierce, Critical Strike, Deadly Strike, Open Wounds, Strength, Dexterity, resistances and other originally transcribed fields. Each line provides *observed*, *calculated*, *delta*, model maturity/status, and an expandable list of the raw source paths and assumptions. Missing/unsupported values display **Unavailable**, never a fake zero. Partial comparisons remain partial even if numerically equal.

The debug panel uses the same imported build, equipment state, active charms, manually allocated skills and AR override as the existing calculation. It is generated from `buildAmazonParityObservations()` (M8/M9) and the live M9c `projectAmazonRangedAttack()` AR result. It doesn't duplicate or change formulas. The original M8 baseline audit remains available separately.

## Comparing a modified build

The 881 reference was captured with Magizon's original main weapon set and a particular historical character state. **If the selected build differs (weapon set, charms, gear toggles, skill points or bonuses, measured base-AR override), the panel remains useful for inspecting changing computed numbers but clearly labels the historical reference as _not directly comparable_.** The delta is then illustrative only, not a verified regression. If the Armory snapshot identity/timestamp differs, the screenshot numbers are suppressed entirely.

In particular, Build B with Magiknaab has **no** Magizon screenshot reference: the debug table can show current computed contributions, but the observed/delta cells must be unavailable. The UI never labels those fields as a live read from PD2.

For Magizon's pinned baseline:
- Multiple Shot AR **881 screen / 736 model / −145**, still unexplained.
- Multiple Shot damage **347–890 screen / 142–388 current partial physical estimate**; don't mistake physical-only math for final elemental-inclusive screen damage.
- IAS **46** matches active gear and eligible charms and produces the source-derived **10 frames**.
- Pierce equipment subtotal **26%** does not yet match the **48%** game display because passive Pierce is not modeled.

These discrepancies guide subsequent S14 formula work; they are not repaired by inventing unexplained constants.

## Review and tests

`pd2/tests/amazon-debug-parity.test.mjs` covers the pinned 881/736 reference, per-field provenance, weapon and charm selection drift, skill edits, AR override, and absence of reference for a different character/snapshot. Execute `npm run check`, `npm run data:test`, and `npm run build`; CI must pass before merge.
