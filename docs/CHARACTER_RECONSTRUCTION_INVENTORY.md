# Character Reconstruction — Milestone 1: Real Armory JSON Inventory and Screenshot Targets

**Scope:** source investigation and reproducible fixture construction only. **No item stat activation, computed character sheet or equipment toggle in this PR.** Parent roadmap: [#1, section 2A](https://github.com/jmbjr/obsidian_lords/issues/1). Build tradeoffs: [#48](https://github.com/jmbjr/obsidian_lords/issues/48).

## Evidence and reproducibility

Two **real public** owner-synced Armory JSON files are available at:
- `public/armory/magizon.json` — `_obsidianLordsSync.syncedAt = 2026-11-03T02:39:05.138Z`; 35 character items and 31 skill records; full PD2 payload retained in its existing public file.
- `public/armory/magiknaab.json` — `_obsidianLordsSync.syncedAt = 2026-11-03T02:42:09.789Z`; 35 character items and 31 skill records.

**Do not** commit these public files a second time as test fixtures. They already publish potentially identifying guild, equipment and character data. `pd2/fixtures/armory/character-schema-v1.json` contains **synthetic, redacted** miniature examples with fabricated character/item names and deliberately preserved *shape* of selected real modifier argument tuples; it is a **structural test fixture**, not an authentic stat or build fixture. Test fixtures must never include original account identifiers, item hashes or guild details.

Reproduce a machine-readable full type/path/field inventory locally:

```bash
npm run armory:inventory > /tmp/armory-source-schema.json
```

`pd2/scripts/armory-inventory.mjs` inventories both snapshots by recursive field path and JSON type, plus per-modifier occurrence, argument-array length and scope (character equipped/stored vs mercenary equipped). It intentionally reports **no modifier values, item IDs, character account/guild data, item hashes or actual names**. Existing snapshots can be overwritten by later syncs, so a new run may produce different shapes/counts; always preserve source sync timestamp and compare prior reports when data refreshes.

### Actual shape observations

- Top-level keys across both: `file`, `character`, `mercenary`, `failed_items`, `items`, `account` (currently null), `guild`, and `_obsidianLordsSync`.
- `character`: name, status, class, attributes, gold, points, life/mana/stamina, experience, level, `skills[]` with `id`, `name`, `level`. These values may represent **base** character fields, not an already resolved character stats screen.
- `items[]`: individual metadata, location (zone, storage, equipment ID), base codes/requirements, modifiers (name, values, labels, priority and sometimes min/max), properties, runeword, damage/defense, durability, sockets and socketed objects, corruption information, position and hash. Some fields only appear on applicable item types.
- `mercenary.items[]` has overlapping item shapes but is an independent modifier scope. The item arrays currently have 12 records with `location.zone="Equipped"` and 23 `Stored` records **per character**. **Do not interpret all twelve as active equipment**: IDs 11/12 can be inactive switch gear. Stored items may include inventory charms that require additional storage semantics before activation.
- The two snapshots contain **81 distinct modifier names in union** when mercenary items are included, and **multiple argument layouts**. Character-only and active-item counts differ. This count is a schema discovery statistic, not 81 supported gameplay calculations.
- Relevant observed modifier families: `item_addclassskills`, `item_addskill_tab`, `item_singleskill`, `item_nonclassskill`, `item_aura`, `item_charged_skill`, `extra_valk`, `maxdamage_percent`, `min_damage`, `max_damage`, `tohit`, `item_tohit_percent`, `item_fasterattackrate`, `item_deadlystrike`, `item_openwounds`, `deep_wounds`, `item_pierce`, elemental damage/resistances, `item_skillongethit` and `item_skillonhit`. **Names and array lengths do not establish engine semantics.**
- **Direct Valkyrie finding:** Magizon's equipped *Harmony* bow (equipment ID 4) includes `item_singleskill` with `values: [32, 6]` and labeled `+6 to Valkyrie (Amazon Only)`. Current `importArmoryAmazon()` stores raw gear and warns but does **not** apply that individual skill modifier. This is an observed missing mapping, **not six unspent/hard skill allocations**. In the other snapshot, `item_nonclassskill` and `item_addskill_tab` occur with distinct array layouts; don't conflate them with Amazon-only single-skill buffs.
- Compare raw vs screen: Magizon Armory `character.attributes.strength=41` and `dexterity=50`, while the screenshot displays STR **65** and DEX **60**; this supports a derived equipment/buff contribution hypothesis, **not yet its formula**. Raw `character.stamina=1313` versus screenshot **1312** is a real recorded one-unit mismatch—do not silently reconcile it.

## Screenshot acceptance observations (manual transcription, not API-derived computations)

The user supplied **five in-game screenshots** as the first parity oracle: (1) Bow & Crossbow tree, (2) Passive & Magic tree, (3) Javelin & Spear tree, (4) Character stats, (5) Extended stats (8). The screenshots live in the originating chat, not in this repository; this document and subsequent tests carry explicitly transcribed targets. Transcriptions may require rechecking before exact-delta acceptance.

| Target view | Observed screen facts | Interpretation boundary |
| --- | --- | --- |
| Three skill trees | 46 unspent skill choices; skill icons, learned-vs-unlearned shading and blue effective level indicators; Bow & Crossbow shows Multiple Shot **21** | Blue levels may reflect equipment modifiers; distinguish hard point, +class, +tree and +single-skill grant; snapshots contain 31 hard-skill rows |
| Character stats | Level **67**; XP **238080481** / next **239192444**; STR **65**, DEX **60**, VIT **120**, ENE **15**; unspent stat points **194**; life **573**, mana **181**, stamina **1312**; Multiple Shot damage **347–890**, AR **881**; Magic Arrow damage **278–694**, AR **529**; defense **401**; visible resists fire **75**, cold **64**, lightning **62**, poison **50** | XP/level/points/raw attributes are in JSON. Final attack damage/AR, XP next level, resists/defense and equipment-adjusted attributes are **not available as final stats fields** and require interpretation/verification |
| Extended stats (8) | Base AR DEX **270** + equip **53** = **323**; base defense DEX **15** + equip **386** = **401**; base 1h damage **13–22**, base 2h **43–117**; IAS **46**, Multiple Shot breakpoint **10 frames**; CS **23**, DS **0**, CB **0**, OW **0% / +165 DPS**; Pierce **48** | Some constituent gear modifiers are present; in-game summary, IAS breakpoints, CS/DS caps and OW DPS require correct stat-source and gameplay rules; not raw JSON fields |

Additional extended-info categories that require a coverage matrix in later PRs: resistances and maxes, poison/cold/curse lengths, absorb, physical/magic reductions, attacker damage return, elemental mastery/pierce, physical pierce, cast/block/recovery/run-walk speeds, leech, kill effects, elemental/poison attack additions, MF/gold find, and contextual buffs.

## Field availability versus support

| Category | Data availability | Current importer status | Milestone 2/3 action |
| --- | --- | --- | --- |
| Hard skills and level | Present in `character.skills[]`, `character.level` | Parsed and applied | Keep distinct from effective points |
| +Amazon class skill `item_addclassskills` | Present | Partially applied on active equipped items | Validate class index, item-scope and activation |
| +tree, +specific, oskills and granted skills | Present as differing modifier families | **Preserved/warned; not applied** | Preserve tuple arguments and prove lookup mappings (including Valkyrie) |
| Base attributes, unspent points, experience | Present | Mostly retained, not reconstructed as stat screen | Derive/evaluate equipped buffs and next-XP formula |
| Weapon damage, flat/percent damage, AR | Present in item fields/modifiers | Partially recognized but not composed into character stats | Determine on/off weapon and ordered arithmetic; avoid double count |
| IAS / breakpoint frames, CB/OW/DS/CS, Pierce | Partial individual modifiers present | Recognized subset, manual combat scenario | Model source-specific and class skills; validate caps/rounding |
| Socketed, corrupted, runeword, set and mercenary effects | Variable nested structures present | Source preserved; arithmetic deferred | Normalize independent scopes; no duplicate resolved socket affixes |
| Actual current buffs, auras, difficultly/monster context, active skill bindings | **Not established as complete fields** | No reliable reconstruction | Explicit user/fixture overrides and unsupported labels |
| In-game UI final calculated values | **Not exposed as full precomputed screen** | Not supported | Treat screenshots as parity oracle, not API values |

**Status language for the coming work:** for each field/contribution distinguish `present/raw`, `parsed`, `mapped`, `applied`, `unsupported`, `absent`; separately tag source confidence (`measured screenshot`, `native S14 source`, `inference`, `unknown`). The inventory command does not infer applied status or formula correctness.

## Follow-on PR boundaries

1. **Milestone 2:** normalized, source-preserving item/gear graph; per-slot active/inactive item scopes, separate charms and mercenaries, socket and unknown-modifier provenance. No best-effort guessing of effect arithmetic.
2. **Milestone 3:** implement +class/+tree/+single/other skill mapping and effective skill activation rules using the real fixture evidence (including +6 Valkyrie).
3. Subsequent milestones: toggles, character-sheet primitives, attack damage/AR/IAS, extended-info fields and final three-screen parity comparison.

**Acceptance for this milestone:** real raw paths and modifier families enumerated, contrasting source shapes documented, reproducible safe inventory script and redacted fixtures tested, initial measured screenshot targets documented, explicit unsupported/unknown gaps identified. The ability to recreate a whole character is **not** claimed yet.
