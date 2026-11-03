# Character reconstruction M7 — Extended Info (8) catalog

This PR implements roadmap #1 section 2A, **milestone 7**, as a source-traced selected-equipment catalog. It is **not** the final screenshot-parity milestone. The page-8 screenshot is the target for M8's field-by-field discrepancy evaluation.

## Scope

The new **Extended Info (8)** section appears for an imported Amazon character and is recalculated on every render from that build's selected **main (4/5) or alternate (11/12) hand slots**, the shared slots, and individual/master item exclusion settings. Other Build A/B sources are never mixed. Character snapshots remain session-only.

It groups observed or anticipated page-8 stats into these categories: Resistance, Defense, Mastery & Pierce, Speed, Critical & Procs, Leech & Recovery, Magic & Gold, Attack Additions, Elemental Additions, and Derived & Unsupported.

Every supported equipment contribution retains **the parent item name, source path, slot, native modifier name, and raw tuple**. Children of socketed items are retained by the M2 graph but **not added again**. Stored inventory charms and mercenary items remain unverified and **are not applied**. The UI shows both available selected-equipment contributions and unsupported final values. Zero in an equipment-only field means **no recognized selected equipment contribution**, not 0% final character power.

## Distinct combat quantities

| Concept | Source or computation in M7 | Boundary |
| --- | --- | --- |
| Critical Strike (CS) | Existing native S14 `dm12` passive preview using effective hard/+skill bonuses and M3 resolver | Not an independently verified final percentage/cap; missing runtime state |
| Deadly Strike (DS) chance | `item_deadlystrike` selected-equipment sum | **Not** added directly to CS; interaction/caps unresolved |
| Crushing Blow (CB) chance | `item_crushingblow` selected-equipment sum | Equipment contribution only; enemy/class modifiers and caps not projected |
| Open Wounds (OW) chance | `item_openwounds` selected-equipment sum | Distinct from bleed DPS |
| Open Wounds DPS | `deep_wounds` selected-equipment sum | Distinct from proc chance and final bleed formula |
| Projectile Pierce | `item_pierce` selected-equipment sum | Passive Pierce skill chance **not yet computed**, so actual total unavailable |
| Physical pierce | `passive_phys_pierce` selected-equipment contribution | Separate enemy physical resistance lowering vs projectile continuation |
| Resistances | Flat elemental `*resist` and `all_resist`, distinct maximum resistance fields | Difficulty, caps, charms, passives and buffs are not applied |
| IAS, FCR, FHR, FBR, FRW | Corresponding named equipment modifiers | IAS frames separately sourced to M6 PD2 Amazon A1 timing; no aura or slow assumptions |
| Absorb/DR, leech and kill recovery, MF/GF | Corresponding signed additive item modifiers | Full game caps and non-equipment modifiers not modeled |
| Elemental attack damage | Raw fire/light/cold tuple min-max and cold duration; poison damage/duration tuples retained **without naïve summation** | Final applied damage, durations and stacking formulas not yet verified |

**Never confuse the status of a field with the value 0**: each row has `equipmentValue`, optional `finalValue`, `status`, traceable `sources`, `unresolved` tuples, and an explicit explanatory `note`. When only an equipment subtotal is available, `finalValue` is null. The existing M6 frames and native critical passive preview appear with labeled, narrower statuses `source-derived` / `skill-preview`.

Unrecognized modifier names stay in the retained original payload/M2 source graph; M7's UI lists only supported catalog families. Non-numeric/malformed tuples in *recognized* families appear in `unresolved` rather than silently contributing fabricated amounts. Prospective modifier names not observed in current fixtures are **candidate mappings**, not independently validated PD2 S14 semantics. They must be checked against game sources before asserting parity.

## Initial observed values from published Magizon

For the main set, selected **equipped gear only**:
- IAS 40 (Finesse +20, quiver +20). The separate 6 IAS inventory charm is deliberately not activated yet. M6 produces 11 bow frames at 40 IAS; 46 would produce the screenshot's 10 frames.
- Life leech 12%, mana leech 3%, projectile Pierce from equipment 26%, Critical Strike native skill preview 23%.
- MF +12%, signed GF +12% (Nadir −33% and Finesse +45%).
- No recognized active-item CB, DS, OW proc chance or deep-wounds DPS, so those equipment-only subtotals read 0; **that is not confirmation that the screenshot's actual OW DPS +165 is wrong.** The screenshots and current raw snapshots may differ, and inventory/buff/stat scope remains incomplete.
- Alternate set adds Hellcast IAS, max fire resistance, different life leech and Light Bolts' physical pierce. All non-hand items remain unchanged.

The user-provided page-8 acceptance screenshot recorded **IAS 46**, **10 Multiple Shot frames**, **CS 23**, **DS 0**, **CB 0**, **OW chance 0 / DPS +165**, **projectile Pierce 48**, **base AR 270 DEX + 53 equipped = 323**, and **base defense 15 DEX + 386 equipped = 401**. The M7 projection does **not** equate equipment-only Pierce 26 with total 48, does not fabricate OW +165 DPS, and does not infer base AR/defense arithmetic. M8 must pin the actual screenshot and snapshot to matching game state and explain every discrepancy.

## Status and follow-up

- M7 tests both published real Armory snapshots and a synthetic equipped item exercising positive DS/CB/OW chance, OW DPS, poison duration, other elemental damage and malformed tuple preservation.
- Direct page-8 totals still missing: complete effective passive Pierce, caps/rounding, Mastery and elemental pierce from skills, skill-dependent rates, active auras, physical base damage distinctions, dynamic chance to hit, curse and poison duration mechanics, world difficulty and inventory charm activation. These are **unsupported or equipment-only**, never silently invented.
- M8 is the three-screen parity matrix. Record `expected screenshot`, `modeled value`, `delta`, `source evidence`, and `open explanation` per field; this may expose additional narrow follow-on PRs rather than justify declaring complete parity.
