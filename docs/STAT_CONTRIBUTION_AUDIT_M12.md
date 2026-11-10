# Milestone 12.1 — Stat contribution coverage inventory

**Status:** evidence-only baseline. This document and `pd2/fixtures/stat-coverage/magizon-level70-coverage.json` are **not** game mechanics implementation or evidence of full screen parity. [Roadmap #1](https://github.com/jmbjr/obsidian_lords/issues/1), Section 2A Milestone 12.

## Captured provenance and configuration

- Current source pin: Magizon L70, Armory `public/armory/magizon.json`, snapshot synced 2026-11-04T05:23:00.408Z, Git blob `223551b159efca8be2d415c703df909337394539`. Character raw DEX 50, STR 74, VIT 120, ENE 15, life 528, mana 153, stamina 353.
- **Main** 4/5 = Short Bow (1–4 base) + Blunt Arrows (+2 maximum); **switch** 11/12 = Harmony Edge Bow (+10 DEX, +6 Valkyrie and other modifiers) + Blunt Arrows (+2 maximum). Slot ID, not the colloquial description "alternate", determines effective source scope.
- No-equipment observations, Short Bow observations and user-confirmed Harmony AR observations were made at different times. Do **not** claim they are one synchronized immutable screenshot/save pair.
- User-confirmed Normal/Nightmare Anya quest rewards produce +20 each elemental resistance for the shown Normal difficulty baseline. These are **explicit runtime context**, not a value present in the Armory JSON.
- User confirmed 528/528 full life. Treat current and maximum resources separately; Armory `character.life` semantics beyond this observation are not yet established.

## Coverage contract

The JSON contains **118 distinct field/subfield keys**, including each visible character-sheet value, each Extended Info (8) subvalue and breakpoint family. Each entry records screen, producer, source categories, current status and missing proof. This is a *coverage census*, not proof of per-field completeness. Status meanings:
- `raw`: copied directly from a character JSON field; not a derived-game parity claim.
- `formula-derived`: local formula has a traced/observed constrained baseline; not automatically a complete final stat.
- `partial`: at least one contribution path exists, but final source completeness is unproven.
- `known-omission`: positively identified missing input or behavior.
- `gap`: no supported calculation path currently established.

## Reviewed producer and dependency seams

| Target | Current producer | Observed seam / missing source | Action |
|---|---|---|---|
| Stat base/defense | `armory-character-sheet.js`, `amazon-base-combat.js` | DEX + selected equipment/charm sources supported, but final buffs/percent defense and quest difficulty are absent | preserve base layer, explicitly separate final |
| AR / selected attacks | `amazon-ranged-attack.js` -> `amazon-ar-explainer.js` | `explainAmazonAttackRating` accepts `skillARPercent` and `gearARPercent`, **no passive Penetrate input**; selected attack currently Multiple Shot-specific | Milestone 12.3: shared contribution path |
| +skills | `pd2-armory.js`, `amazon-comparison.js` | imported hard/effective skills feed skill previews, but passives aren't universally emitted as contributions to dependent final stats | audit each affected stat |
| Extended info | `amazon-extended-info.js` | equipment-only sums and selective Critical Strike; passive projectile Pierce explicitly unsupported; OW DPS doesn't include level-dependent baseline | retain explicit gap |
| Item scope | `armory-equipment.js` | switch sets 4/5 vs 11/12, charms by occupied grid; socket-child modifiers intentionally excluded | preserve no-leak / no-double-count invariants |
| Resources and quests | `armory-character-sheet.js` | life/mana/stamina raw fields; max resources, Anya quest flags and difficulty context not in source projection | add context in later stage |
| Damage and timing | `amazon-ranged-attack.js` | partial Multiple Shot physical damage and selected IAS frame model; quiver, no-bow/normal attack, skill-specific damage and aura interactions need acceptance | per-field audit later |

## Confirmed numerical oracles; not substitutes for implementation tests

- **50 DEX Short Bow:** base AR `5*50-30 = 220`; user-confirmed Penetrate +35%; observed Attack AR `trunc(220*1.35)=297`.
- **60 DEX Multiple Shot:** base AR 270; user-confirmed Penetrate +35% plus Multiple Shot +122%, **additive** in this measured context; observed `trunc(270*2.57)=693`. Whether this extends to other skills, auras or classes is **unproven**.
- **50 DEX defense:** `floor(50/4)=12`, matching the observed source screen.
- **No gear OW display:** 0% chance, **+178 DPS**, so chance and displayed damage must remain distinct.
- Normal resistances 20/20/20/20 from manually verified Anya rewards; no false gear contribution.
- Short Bow panel observed damage 1–7, Attack Rate 95, IAS 0, 14 frames, Base Damage 1h 0–2 and 2h 1–6. Display semantics must be researched, not substituted with raw base bow 1–4.

## Step 12.1 acceptance boundary

An inventory is complete when all screen **subvalues**, not merely labels, are enumerated; each has a traceable module, status and explicit missing source type; known omissions are not marked complete; source and screenshot provenance is recorded; deterministic structural tests pass. Do **not** mark Milestone 12.1 merged or audited-final while PR is open. Step 12.2 decides data structure and evaluation order, Step 12.3 changes calculations.
