# M11: Source-first Item and Inventory Debug

The M11 inspector is nested under the **current Armory JSON Debug** panel, initially collapsed. Every category, subsection, subtotal and individual item starts collapsed, and is recomputed for the currently imported Build A or B.

## Categories and composites

- **Equipped gear:** main hands (slots 4/5), alternate hands (11/12), and shared equipped slots (all other equipped items), with per-item details and raw subtotal for each.
- **Main hands + shared** and **Alternate hands + shared:** independent composite totals, so users can evaluate the two sets with and without shared equipment without activating both sets simultaneously. Composite sections show summaries only; open the individual source sections for item drilldown.
- **Charm inventory:** all charm candidates, with separate raw-all and *configured active* subtotals. Placement eligibility uses the existing lower-four-row PD2 charm grid, overlap screening and independent charm toggles. Ineligible charms appear individually with their status, but never contribute to configured totals.
- **Main inventory (non-charm)** and **Horadric Cube:** individually inspectable items and hypothetical raw subtotals, with configured totals always zero. Empty sections explicitly say no items in the current API snapshot. Other/stash/unresolved locations are retained in a separate section rather than silently discarded.

## Source and arithmetic boundaries

Each item shows its **Armory source path, slot/storage/position, parent resolved modifiers** (native name, display label, raw value tuple and source path), and separately resolved defense/weapon damage where available. Socketed child data is provenance-only because its effects may already be reflected in the resolved parent; never sum children a second time.

Section totals sum only **single numeric scalar modifiers with the same native modifier name**. The model does *not* sum multi-field tuples (such as `firedam` ranges, `poisondam`, class-skill selector pairs or aura fields), unsupported state flags, or other raw selector encodings. Such fields remain visible individually and are counted in a separate **not safely additive** list. Source totals do not apply game rules such as caps, resistance penalties, stacking of different stat names, percent-vs-flat interactions, weapon damage effects, or character stat equations. Item-resolved defense/weapon damage is **not included** as a separate additive affix.

**All-items / hypothetical** sums ignore the live enable/disable toggles; **configured inclusion** sums reflect the current gear and charm selection for each possible set independently. Inventories and cube always have empty configured sums; only equipped items and eligible active charms are candidate contributions. These are inspection-only objects and cannot change the calculator.

## Verification

`pd2/tests/armory-item-inspector.test.mjs` uses live-synced published Magizon input and synthetic stored/cube fixtures. It checks independent main/alternate composites, inclusion toggles, charm activation, no unintended stash/cube effects, preservation of raw paths and compound tuples, and collapsed/escaped HTML output. **No AR, damage, IAS, defense or skill formula changes.**
