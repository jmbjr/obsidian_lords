# Character reconstruction M9c — Expandable Multiple Shot AR equation

M9c is a **readability and review-only** implementation. It does not change the M9b attack-rating equation or claim to explain the discrepancy between the in-game **881** and the current source-derived **736**.

## Where to review

Open the Amazon sandbox and import Magizon (or Magiknaab), then find **Ranged attack · Build A/B · M6 → Attack rating · conditional → Show full AR calculation · intermediate values and sources**.

This is a native HTML `<details>` section, collapsed by default. Open it to review:
1. Current effective Dexterity and every source contributing to it.
2. Derived base AR (`5 × DEX − 30`) or the explicitly selected *measured base AR override*.
3. Flat AR contributed by active gear and eligible inventory charms, with individual source names, amounts and Armory paths.
4. Additive base (`baseAR + flatAR`).
5. Hard Multiple Shot level, supported skill bonuses, resulting effective level.
6. Multiple Shot AR percent (`8 + 6 × (effectiveLevel − 1)`).
7. Other equipment AR% sources, traced separately.
8. Combined modeled AR% and multiplier.
9. Pre-rounding product and the implemented truncation/clamping step.

**Single arithmetic implementation:** `src/amazon-ar-explainer.js` calculates these intermediate values **and** the final result. `src/amazon-ranged-attack.js` now calls that helper rather than duplicating a second formula. Every equipment, charm, weapon-set or manual base-AR change flows into the same model; Build A/B states remain independent.

For the pinned Magizon main-set snapshot, with gear and eligible charms active, the model is:

```text
DEX = 60
AR from DEX = 5 × 60 − 30 = 270
Flat AR: +43 selected gear +10 eligible inventory charm = +53
Unmodified base AR = 270 + 53 = 323
Multiple Shot effective level = 20 hard +1 supported bonus = 21
Multiple Shot bonus AR% = 8 + 6 × (21 − 1) = 128%
Other selected gear AR% = 0%
Combined % = 128%, multiplier = 2.28
323 × 2.28 = 736.44
truncate, minimum zero = 736
Screenshot: 881 (still unexplained)
```

**Limitations:** This is the exact *currently implemented* provisional M9b math, **not yet established as the full PD2 AR equation**. Potential missing passive AR%, aura effects, conditional item/skill modifiers, ordering and screenshot/snapshot synchronization are displayed clearly. The inspector does not add an unexplained constant or attempt to force 881.

## Acceptance

Regression tests validate source paths, intermediate arithmetic, the 736 result, independent selected gear/charm swaps, measured override and unsupported skill behavior. CI's regular `npm run check`, `npm run data:test`, and `npm run build` must pass. Browser manual review should verify the section expands correctly and values update after equipment changes.

Follow-on research should identify the actual missing AR component using PD2 S14 sources; leave that outside this UI-only PR.
