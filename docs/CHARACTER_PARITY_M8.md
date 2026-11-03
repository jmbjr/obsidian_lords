# Character reconstruction M8 — three-screen measured parity audit

**Scope:** audit the existing models against the user-provided screenshots without inventing formulas or pretending that the current Armory snapshot is synchronous with screenshots. Roadmap: [#1 section 2A](https://github.com/jmbjr/obsidian_lords/issues/1). Source code: `src/amazon-parity.js`. Measured reference: `pd2/fixtures/character-parity/magizon-screen-observations.json`.

## Reproduce the audit

```bash
npm run parity:magizon > /tmp/magizon-m8-parity.md
npm run data:test
```

The report compares **42 transcribed observations** spanning the three Amazon skill trees (only one confidently transcribed skill level), character stats, and Extended Info (8). Original screenshots are part of the project conversation; they are not silently included as images in the repo. The fixture attributes each transcribed value to that conversation and explicitly marks unobserved values `null`, **not zero**. The 29 current playable Amazon skills are enumerated separately with only Multiple Shot 21 assigned an observed numerical skill reference. Avoid/Shattering Arrow are retained in source but excluded from current playable-tree coverage.

The comparison assumes Magizon **main weapon set 4/5, all equipment included, no manual skill modifications**. The corresponding published Armory JSON is pinned to `2026-11-03T02:39:05.138Z` (Git blob SHA `ecc32342e4cf4b0d2420f17178443053bf08fc70`). The in-game screenshots were provided earlier but do not have an independently verified capture timestamp matching the Armory snapshot. The audit intentionally fails closed if the snapshot sync metadata, character identity, weapon set, manual build, or gear configuration changes. **An identical number produced by a partial or speculative calculation is never awarded a full match.**

Model-side data comes from imported hard skills and M3 +skills; M5 raw character fields and selected equipment; M6 partial Multiple Shot physical/AR/IAS; and M7 selected equipment extended stats. The existing calculator remains unchanged outside the added *read-only* parity section: `Screenshot parity audit · M8`, available for the pinned Magizon reference. Build A/B what-if interactions are **not** incorrectly scored against a fixed screenshot.

### Verdict semantics

| Verdict | Definition |
| --- | --- |
| `match` | The modeled source/raw or supported skill preview equals the observation, with compatible meaning. This is **not** proof of engine parity |
| `mismatch` | A directly comparable source measurement disagrees, e.g. raw API stamina 1313 vs screenshot 1312 |
| `partial` | A modeled *subset* (selected equipment subtotal, provisional ranged damage or attack frames) is compared to an in-game display. Any numerical difference is diagnostic, not an established equation error; even 0 difference is not a verified match |
| `unavailable` | The required game-rule calculation is unsupported or the requisite runtime field is absent; modeled value and gap are `null` |
| `not-observed` | No confidently transcribed screenshot value (e.g. full skill tree levels), even where the model produces one |
| `snapshot-drift` | The raw character snapshot/identity no longer matches pinned reference; all comparisons invalid |
| `configuration-drift` | Weapon loadout, item exclusions, or manually edited build/bonus not represented in original screenshot; all comparisons invalid |

Each field records screenshot view, label, observed value, model value, numeric gap **only when numerically comparable**, verdict, model status, source paths, explanation, and optional unverified charm candidates. Never equate `equipment-only 0` with `game total 0`.

## Provenance-supported gaps: inventory charms

**Key discovery:** Four independently transcribed screen discrepancies reconcile *exactly* with raw inventory-charm tuples already in `magizon.json` (zone `Stored`, storage `Inventory`, charm base codes `scha`/`mcha`/`lcha`). They are currently excluded because the M2 character graph intentionally marks charm eligibility/active storage region as unresolved. The audit only reports them as **candidates**, never adds their effects to final stats.

| Field | Modeled from equipped slots | Observed screenshot | Raw Inventory charm evidence | Numerical reconciliation |
| --- | ---: | ---: | --- | --- |
| Strength | 59 | 65 | Grand Charm of Strength: `strength [6]` | +6 |
| IAS | 40 | 46 | Quick Large Charm of Blight: `item_fasterattackrate [6]` | +6 |
| Base AR from equipment | 43 | 53 | Fine Grand Charm of Balance: `tohit [10]` | +10 |
| Equipment defense | 367 | 386 | Stout Small Charm of Anthrax `armorclass [1]`; Burly Small Charm of Balance `armorclass [18]` | +19 |

**Priority closure task:** verify PD2 S14 active charm-inventory rules and the published Armory position fields, then explicitly model selectable/active charm scope. Do not apply stashed charms, off-grid charms, inactive gear or mercenary bonuses. Once verified, recompute every M5–M7 stat from source without double-counting and re-run the audit. Matching these four numbers is a highly useful test, but still not proof of exact screenshot state.

## Additional key gaps

| Target | Screenshot | Current model | Reason/evidence | Priority |
| --- | --- | --- | --- | --- |
| Multiple Shot effective level | 21 | 21 | Imported +skills/hard levels agree; preview is source-constrained | Present support; keep regression |
| Critical Strike chance | 23% | 23% | M3/M7 skill `dm12` preview agrees; final interaction/caps unverified | Keep regression |
| Stamina | 1312 | Raw Armory 1313 | Direct difference; possibly snapshot timing/state/rounding, **not proven** | Capture synchronized screenshot |
| Multiple Shot damage | 347–890 | Partial physical-only 142–378 | Additional elemental damage on Harmony (+55–160 fire/cold/light) and missing charm damage are separately present in the source; exact damage composition/rounding still unverified | High |
| Multiple Shot attack rating | 881 | Not computed | Base AR, passive modifiers and arithmetic order still need verified rules | High |
| Magic Arrow damage/AR | 278–694, 529 AR | Not computed | Selected-skill-specific conversion and AR not yet modeled | High |
| Defense | 401 | Equipment subtotal 367 | +19 charm contribution explains equipment-specific 386; separate 15 Dexterity defense term still requires verified formula | High |
| Projectile Pierce | 48% | Equipped `item_pierce` 26% | Amazon Pierce passive and stacking rules not modeled; do not assume the remaining 22% equals a proven passive formula | High |
| IAS and Multiple Shot frame count | 46%, 10 frames | Equipped IAS 40%, pinned A1 model 11 frames | +6 IAS charm gives 46%, and existing sourced model then gives 10 frames, conditional on verified charm activation and absence of other speed effects | High |
| OW chance and DPS | 0%, +165 DPS | Equipped chance 0%, `deep_wounds` subtotal 0 DPS | Chance 0 vs DPS 165 is **not contradictory**; the game can display a separate DPS stat. Formula/other sources for displayed DPS require research, not guessed affixes | Medium |
| Resistances | Fire 75, Cold 64, Lightning 62, Poison 50 | Selected-equipment subtotals | Difficulty penalties, caps and inventory charms missing; never call these final resists | High |
| Base weapon 1h/2h damage | 13–22, 43–117 | Unavailable | Distinct semantics from resolved bow damage 39–104; do not substitute unrelated item damage fields | Medium |
| XP threshold | 239,192,444 | Unavailable | Source-backed next-level XP progression required | Medium |
| Extended info other fields | Many values not confidently transcribed | Partial source catalog in M7 | Collect synchronized labeled screenshots for full final-field validation | Medium |

### Proposed follow-on slices for M9 and later

1. Verify active inventory-charm region and activation, introduce **per-item charm toggles** while keeping two independent hand-slot weapon sets and mercenary scope; regression-test four exact charm reconciliations.
2. Independently source PD2 S14 Dexterity→defense/AR, passive Pierce, selected-skill damage (including Magic Arrow elemental conversions), Open Wounds DPS formula, and damage rounding/caps; record formula revision and controlled cases before applying.
3. Make A/B character contexts independent where level/difficulty/buffs matter, and capture synchronized Magizon screenshots and snapshot **in the same state** (main/alternate set, skills, map difficulty, buffs).
4. Re-run 42-field report plus a fully annotated 29-skill tree matrix. Mark each field as verified only when the correct source+formula reproduces the matching screenshot context. Any remaining fields stay on an explicit unsupported/backlog list.

**M8 acceptance:** reproducible screenshot/Armory comparison, source-linked categories and numeric gaps, fail-closed source/setting drift, independently sourced charm hypotheses, an honest supported/partial/unavailable distinction, and ranked concrete next actions. **M8 does not declare full three-screen parity**, because that would misrepresent the evidence.
