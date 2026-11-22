# Obsidian Lords · PD2 Season 14 context

Start here when resuming the PD2 S14 project in a new session. [Roadmap issue #1](https://github.com/jmbjr/obsidian_lords/issues/1) owns priorities and acceptance criteria. Check current `main`, relevant issues, and PR checks before choosing the next change. See [README.md](README.md) for local setup and [PROCESSES.md](PROCESSES.md) for the PR workflow.

## What we are building

- **Guild site.** The Obsidian Lords public site and PD2 tools deploy through GitHub Pages. The site lives in `src/`, and game-data ingestion and analysis live in `pd2/`.
- **Season 14 Amazon calculator.** Compare two independent builds, allocate skills, import official Armory snapshots, and inspect how gear and skills affect the character. The immediate product goal is to explain and reproduce the three in-game views: effective skill trees, the character sheet, and Extended Info (8).
- **Mechanics research.** Use pinned Season 14 tables, documented patch behavior, and controlled in-game observations to validate calculations. Combat previews support explicit scenarios, including Multiple Shot and on-hit effects. Keep scenario assumptions visible so they can be tested in-game.

## Decisions to carry forward

- Preserve raw Armory payloads, upstream table revisions, and observation provenance. Distinguish game measurements, source-table values, derived outputs, assumptions, and unknowns. Compare captures at the same level, gear, active weapon set, and runtime context before treating a delta as a formula defect.
- Keep Build A and Build B independent across allocations, bonuses, imports, item and charm selections, and active weapon sets. Equipment toggles recompute dependent outputs from eligible sources. Only active hand slots contribute, with main in slots 4/5 and switch in 11/12. Apply eligible inventory charms and keep mercenary sources scoped separately.
- Distinguish hard points, effective levels, and skills granted directly by gear. Magizon's Harmony bow grants +6 Valkyrie with zero hard points. Preserve the grant and the zero-point allocation.
- Trace calculations from the snapshot through normalized contributions, skill availability, and derived stats. Record scope, stacking, order, rounding and caps wherever evidence supports them. Check for duplicate contributions from resolved item modifiers, sockets, and on-weapon bonuses. Expose missing runtime inputs such as quest rewards, difficulty, buffs, and active skill.
- Use field-by-field comparisons for screen parity. Record expected and calculated values, deltas and source explanations. Keep unverified and unavailable values visible. Work in focused PRs and use CI plus in-game acceptance to establish parity.

## Magizon reference observations

| Capture | Observation |
| --- | --- |
| Level 67 screenshot fixture | Strength 65 (59 + 6 active charm), IAS 46 (40 + 6 active charm), base AR 323 (270 Dexterity + 53 equipment), and base defense 401 (15 Dexterity + 386 equipment). |
| Level 70 Short Bow normal attack | Base AR 220 with +35% Penetrate reproduced displayed AR 297. |
| Level 70 Multiple Shot | Base AR 270 with +35% Penetrate and +122% Multiple Shot gave 693.9, consistent with displayed AR 693 after truncation. |

The level-67 and level-70 observations capture different character states. The level-70 audit also distinguishes the Short Bow main set, Harmony switch, and no-equipment observations taken at different times. The two AR cases are regression targets for their measured configurations. See the [M12 audit](docs/STAT_CONTRIBUTION_AUDIT_M12.md) and [level-70 coverage fixture](pd2/fixtures/stat-coverage/magizon-level70-coverage.json) for the source pin, context, and remaining gaps.

## Where work stood on 2026-11-22

[M12.1 (#71)](https://github.com/jmbjr/obsidian_lords/pull/71) merged on November 9 Pacific time (`8cb5cfa`) and [PR CI passed](https://github.com/jmbjr/obsidian_lords/actions/runs/41960572999). The audit inventories 118 screen fields and subvalues. It recorded an omitted Penetrate contribution and gaps in passive Pierce, quest resistance inputs, Open Wounds DPS, and resource semantics.

As of this handoff, roadmap §2A points next to **M12.2**, a shared contract for contribution semantics, dependencies, evaluation order, and Build A/B context. **M12.3** uses that contract to prove the base AR → Penetrate → selected-attack AR path. Broader coverage and full-screen acceptance follow under M12.4 and M12.5. Refresh this checkpoint when the next accepted change alters where a new session should resume.

## Related threads

- [Build optimization (#48)](https://github.com/jmbjr/obsidian_lords/issues/48) compares the marginal impact of skills and gear in explicit combat scenarios. Useful real-gear comparisons depend on character reconstruction.
- [Offline verification lab (#52)](https://github.com/jmbjr/obsidian_lords/issues/52) tracks a repeatable calculator export → controlled in-game test → observation import loop.
- [Roadmap #1](https://github.com/jmbjr/obsidian_lords/issues/1) tracks unresolved Multiple Shot projectile behavior, including self-cast versus item-triggered use, Pierce, and effect eligibility. It also preserves the earlier Poison Strike and Spectral Plate experiments.
