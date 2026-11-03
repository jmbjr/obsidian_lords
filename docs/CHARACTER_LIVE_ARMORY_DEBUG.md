# Current Armory JSON Debug (live sync)

The user requested replacing the old screenshot-timestamp-gated Debug table with a source-grounded inspector that follows whatever official character JSON was most recently synced.

## Data semantics

The official PD2 Armory JSON exposes **raw** character fields (`character.level`, `character.attributes`, `character.skills`, life/mana/stamina/XP, etc.) and full `items[]` with modifier tuples, location/weapon slots, eligible inventory-charm positions, item-resolved defense and weapon damage.

**It does not expose a final selected-skill Multiple Shot AR, final skill physical damage, final resistances or final attack-frame count as direct JSON fields.** The browser must not invent official readings for these. The reconstructed values from M5–M9c are **our calculated outputs**, with status and provenance explicitly separate.

## How to use it

1. Sync Magizon or another Amazon via GitHub Actions, refresh the published site, and import the currently published JSON into Build A or B. The Debug pane displays the character name, level, and exact `_obsidianLordsSync.syncedAt` from that loaded source.
2. Expand **Ranged attack → Attack rating → Debug · current Armory JSON vs calculated values**. This panel does not use the old screenshot timestamp or reject new syncs.
3. Browse expandable groups: Raw Character, Attributes, Attack Rating, Attack Speed, Combat Effects, Resistances, Defense, Weapon, Skills, and Calculated — not directly in JSON.
4. Each row shows the **raw official JSON number / exact subtotal of current selected raw modifiers**, **our interpretation / computed subtotal**, and a signed delta **only when both sides have equivalent semantics**. Expand item evidence to inspect original JSON paths, native modifier names and amounts.
5. For derived Multiple Shot AR and damage, the official field is labeled **Not provided**, and the model value is explicitly marked **model-only**. The existing full AR equation explainer remains available immediately below Debug.
6. Switch hand sets, enable/disable gear and individual charms, edit skills or override base AR. Source/raw values and projected subtotals follow the currently selected Build without changing original JSON.

**Key boundary:** an equipment subtotal that matches our equipment aggregator proves the collector is consistent with JSON, not that final PD2 game rules are correct. The remaining AR formula questions must be answered from additional game rules, captured in-game screen values or independent verification; the Armory JSON alone does not contain them.

## Archived M8 snapshot

The old screenshot evidence from the previously synced Magizon level-67 character is retained in the historical M8 test fixture `pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json` and `pd2/fixtures/character-parity/magizon-screen-observations.json`. Its tests no longer read the mutable `public/armory/magizon.json`. The old screenshot matrix is removed from the **live sandbox** to avoid stale comparisons; historical research remains reproducible from the frozen fixture.

## Verification

`npm run check`, `npm run data:test`, and `npm run build` via CI. The new `amazon-armory-debug.test.mjs` covers current sync identity, raw fields, item/charm modifier subtotals, weapon switching, source traceability, AR overrides and the absence of a fake official final skill AR value.
