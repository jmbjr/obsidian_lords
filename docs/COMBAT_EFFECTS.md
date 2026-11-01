# Combat-effects foundation (Season 14)

This module implements **independent pure calculations**, not a runtime emulator or a DPS display. It does not add equipment inputs or change the Amazon skill sandbox. Future Multiple Shot integration must explicitly supply per-target confirmed hit opportunities; never multiply by arrows fired to imply all arrows can hit the same monster.

## Provenance

Pinned upstream revision: [coleestrin/pd2-tools @ 7952f34719aa3a5cb41334a91fe36dbcbdd8be9c](https://github.com/coleestrin/pd2-tools/tree/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c).

- [api/src/utils/target-damage.ts](https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/utils/target-damage.ts): Critical Strike / effective Deadly Strike / ordinary physical outcome weighting. This module uses mutually exclusive outcomes with critical-first chance; it does not implement target-specific damage mitigation.
- [api/src/utils/effective-damage.ts](https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/utils/effective-damage.ts): Crushing Blow current-life formula, normal/prime-evil/special-map boss divisor, party-size adjustment, ranged 1.5 modifier, CB efficiency and effective physical resistance; Open Wounds attacker-level bands, flat bonus, five-second application window and shared three-stack cap.
- [EFFECTIVE_DAMAGE.md](https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/game-data/pd2/season-14/EFFECTIVE_DAMAGE.md): upstream validation and cautions about engine/runtime and unmodeled collision.

## Public functions

- `strikeOutcomes`: probabilities of normal / Critical Strike / Deadly Strike, and expected physical damage multiplier **before target mitigation**. Critical and Deadly do not stack. Probabilities are input percentages; multipliers are explicit inputs.
- `crushingBlowOnHit`: CB damage **conditional on proc** and mean damage **per landed eligible hit** against a target at its specified current life; not DPS, and not a multi-hit simulation. Caller supplies CB-specific effective resistance; it is **not** inferred from equipment pierce.
- `openWoundsDamagePerStack`: estimated per-stack bleed DPS from attacker level, source flat bonus and OW-specific physical resistance.
- `openWoundsWindow`: expected applications, at-least-one chance, expected active stacks (max 3) and steady-window estimated bleed DPS for one target. Fractional trials use source-style interpolation; repeated applications are **not** summed as independent DPS stacks beyond cap.

## Explicit exclusions / integration boundaries

No proc eligibility per arrow, target overlap, hit chance, attack cadence, Pierce rerolls, chance-to-cast chain, knockback/blind/slow valuation, monster snapshots, respec/equipment integration, in-game parity assertions or per-target life evolution. The source upstream computes additional target mitigation, monster modifiers and chance-vs-hit logic that is deliberately **not** silently reproduced here. The special map-boss divisor must be selected explicitly; prime-evil status by itself does not identify map bosses.

Results are suitable for comparing *scenario assumptions* and for later integrating with a separate hit/opportunity model. They are **not** a claim that every arrow from a 25-arrow Multiple Shot volley independently hits or procs. In particular, multiplying current-life CB damage by multiple hits without updating life can overstate the result.
