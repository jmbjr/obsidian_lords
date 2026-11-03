# Character reconstruction milestone 2 — source-preserving equipment graph

Scope: pure model and tests only. **Not yet connected to the calculator UI and not a gameplay stat calculator.** Roadmap #1 §2A; milestone 3 will resolve skill bonuses; milestone 4 introduces player-facing equipment/set selection controls.

## Two weapon sets: only hand slots switch

Live Armory payloads for Magizon and Magiknaab confirm the exact mapping of **equipped** item IDs and names:

| Scope | PD2 slot IDs | Behavior |
| --- | --- | --- |
| Shared, non-hand equipment | 1 helm, 2 amulet, 3 armor, 6 right ring, 7 left ring, 8 belt, 9 boots, 10 gloves | Active in **both** weapon sets |
| Main weapon set | 4 right hand, 5 left hand | Active only for `weaponSet: "main"` |
| Alternate weapon set | 11 right hand switch, 12 left hand switch | Active only for `weaponSet: "switch"` |
| Inventory charms | `location.zone="Stored"`, `storage="Inventory"`, base type `scha`/`mcha`/`lcha` | **Unresolved candidate** — requires inventory active-charm area/position semantics; not equivalent to equipped gear |
| Other stored items | Stash, inventory noncharms, etc. | Not active |
| Mercenary equipment | Independent `mercenary.items[]` | Never included in player's equipped gear; later character-auras interactions require a separate source-aware model |

**Critical behavior:** switching weapon sets must **not** disable armor, rings, gloves or any other shared non-hand items. For example, Magizon's main Harmony bow and Sharp Arrows (4/5) are replaced only by Hellcast and Light Bolts (11/12), while Nadir, Finesse, amulet, rings and other gear remain the same. Different weapon/quiver pairs can provide different skill, AR, damage, pierce and attack-speed modifiers.

## API / sample usage

```js
import { normalizeArmoryEquipment, selectEquipmentSources } from "./src/armory-equipment.js";

const graph = normalizeArmoryEquipment(armoryPayload);
const main = selectEquipmentSources(graph, {weaponSet:"main"}); // default
const alternate = selectEquipmentSources(graph, {weaponSet:"switch"});
const noGear = selectEquipmentSources(graph, {weaponSet:"switch", includeEquipment:false});
const minusHelmet = selectEquipmentSources(graph, {weaponSet:"main", excludedItemIds:["items[0]"]});
```

`excludedItemIds` uses stable **source-path IDs within the imported snapshot**, not mutable display names or arbitrary hashes. These are suitable for toggles attached to one snapshot, but should **not** be persisted across new imports without a reconciliation/migration strategy, because item array order can change. The future UI must track active set independently for Builds A/B and clearly reconcile item exclusions after re-syncing.

The selection result contains `activeItems`, `inactiveItems` (with exclusion reason), `unresolvedItems` (charms and mercenaries), and `candidateModifiers`. This does **not** claim every modifier is valid, has been applied, or is even meaningful to the player. Unknown modifier tuples survive with source path and raw record.

## Socketed gear and no double-counting

The Armory endpoint's parent items expose already resolved `modifiers[]` plus `socketed[]` child items. The graph preserves both, but explicitly marks:

- `item.modifiers[]`: `aggregation: "resolved-parent-only"` — the only *candidate* source for future arithmetic.
- `item.sockets[].modifiers[]`: `aggregation: "provenance-only"` — not counted a second time.

Runeword data, corruption fields, durability, base damage, defense, raw properties, socket children, item metadata and unfamiliar modifier names all remain accessible via `item.raw` and `graph.source.raw`. This model intentionally **does not** add socket modifiers to parent modifiers, recalculate a runeword or apply an item effect.

## Source evidence and limitations

- Real published `public/armory/magizon.json` and `public/armory/magiknaab.json` validate that the four hand IDs are 4,5,11,12 and all other equipment stays shared.
- Inventory items labeled `Stored/Inventory` may be active charm sources, but in-game storage layout and eligible charm-region boundaries are not yet fully interpreted. We deliberately retain them as **unresolved** rather than dropping them or treating every inventory item as active.
- Two snapshots show all 12 equipped records, but missing hand pieces, other classes or two-handed weapons must also work. Empty slots are permitted. Duplicate equipped-slot records generate a warning and retain both originals for inspection; future consumers must not silently sum duplicate slots.
- Mercenary source item effects may indirectly affect a character through auras, but that is **not** permission to simply merge the mercenary's raw item bonuses with player stats.
- No equipment contribution totals, effective +skills, character stats, toggle UI or parity claims yet. Those depend on later verified semantic mapping.

**Milestone-2 acceptance:** normalized graph with exact raw field/source preservation, bounded active hand-set selection, shared non-hand gear, socket child provenance, independent mercenary and charm scopes, exclusion/master-filter selection mechanics, and deterministic regression tests for both real snapshots. No guessed arithmetic or activation of unverified effects.
