# Character Reconstruction M5 — Source-Aware Character-Sheet Primitives

Scope: master roadmap #1 §2A milestone 5 (first stat foundation), plus removal of obsolete **Avoid** from the playable Passive & Magic tree. M6 handles final selected-skill damage, AR and attack frames; M7 handles extended stats. No engine-parity claim is made in M5.

## Source inputs and aggregation

The original published PD2 Armory snapshots (Magizon and Magiknaab) contain `character.attributes`, level, experience, unspent stat/skill points and life/mana/stamina. Their values are preserved **as raw snapshot readings** with original JSON source paths. We do not invent game-display rounding, difficulty or live-buff state.

`projectArmoryCharacterSheet(payload, {weaponSet,includeEquipment,excludedItemIds})` uses M2's equipment source selector, recomputing from the original immutable snapshot:

| Category | M5 result | NOT claimed |
|---|---|---|
| STR / DEX / VIT / ENE | Armory base attribute + individually traced flat `strength`, `dexterity`, `vitality`, `energy` and `all_attributes` modifiers on selected items | Final in-game value when charm effects, unmodeled set bonuses, buffs, or unknown effects exist |
| Experience, unspent points, life, mana, stamina | Exact raw Armory fields, labeled `source` | Live change when gear disabled, next-level XP or maximum resources |
| Fire / cold / lightning / poison | Sum of selected `all_resist` plus corresponding flat elemental resist modifiers | Final on-screen resistances; difficulty penalties, caps and inventory charms are not applied |
| Item defense | Sum of already resolved `item.defense.total` from selected armor, plus separately traced flat `armorclass` on items without resolved defense; never reapply local armor affixes | Complete character defense (Dexterity, skill bonuses/auras and engine rounding excluded); never apply `item_armor_percent` a second time |
| Equipment attack rating | Flat `tohit` plus separate `item_tohit_percent` categories, source paths preserved | Final AR, order of flat/percentage bonuses, skill-specific AR or chance to hit |
| Active weapon physical min/max | Already resolved `item.damage.two_handed` for the chosen right-hand weapon slot, labeled **raw weapon damage** | Final displayed skill attack damage, elemental additions, other weapon types, attack frames, chance to hit |

All selected item modifiers are **parent resolved records** only: socket child modifiers remain provenance, not extra stat contributions. Switching weapons replaces slots 4/5 with 11/12; shared slots 1/2/3/6/7/8/9/10 remain active. The M4 master and individual item selectors recompute displayed supported contributions immediately. Mercenary and unverified charm candidates are not applied to the character.

**Field statuses:** `source` (API reading), `equipment-derived` (sum of recognized selected sources), `partial` (known contribution but incomplete final formula), `unsupported` (final engine calculation unavailable), `unavailable` (source missing). A value of 0 from no selected modifiers is a **zero contribution**, not evidence that a character's full final stat is zero. Every supported calculation has a per-source contribution breakdown, and all unknown final values remain null rather than fabricated.

## Screenshot discrepancy that motivates the boundary

Magizon's pinned published snapshot reports base Strength **41**, Dexterity **50**. Selected main equipment (without unresolved inventory charms) gives an additional **+18 Strength**, **+10 Dexterity**, hence the M5 *partial* projections **59 STR and 60 DEX**. The user screenshot shows **65 STR and 60 DEX**; the remaining +6 STR difference may be from inventory charms or another unmodeled source and is not silently assigned. Also, raw stamina **1313** versus screen **1312** remains unexplained; M5 displays the Armory reading as such.

The main Harmony bow has raw resolved **39–104** physical damage and +10 Dexterity. The alternate Hellcast has **39–76** and removes that +10 Dexterity while retaining all shared item attributes; its +13 flat Defense is tracked separately from the armor subtotal of 367. M5 does not recalculate the screenshot's **347–890** Multiple Shot damage; M6 will add the underlying skill/off-weapon equations and rounding with separate parity verification.

## Avoid and Shattering Arrow

Native S14 table keeps all 31 Amazon entries, including **Avoid (ID 18)** with unusable SkillDesc row 0 and **Shattering Arrow (ID 365)**. Both are historical/source-only and have no playable tree coordinates. They remain inspectable in a historical tray and are not put in the Passive & Magic tree, nor may the UI assign new hard/bonus points to them. Existing raw hard-point data is not erased by the layout decision.

This is a **presentation/eligibility correction**, not deletion or renumbering of canonical skill IDs. Later work should confirm any legacy interactions through captured saves if unexpectedly present.

## Boundaries and next milestone

- Inventory-charm placement/activation and source scopes still require verification; item stats currently reflect **selected equipped items only**.
- No active difficulty, aura sources, buffs, item requirement suppression, set completion semantics, or derived cap/rounding engine is assumed.
- The snapshot's character level is still shared between A/B in the old sandbox. M5 displays per-character raw level/XP separately, but deeper independent character-level handling belongs to future UI parity work.
- M6: real selected-skill attack damage and AR with Dexterity, flat/on/off weapon effects, per-skill ED, and cadence; keep data provenance and explicitly label unverified formulas.
- M7: extended-stat page 8 coverage, including resistance caps, OW, DS, CB, Pierce and leech.

Run `npm run data:test` for regression coverage, including both published Armory snapshots and switch/gear exclusion cases. No claim of in-game parity is made until screenshot comparison.
