# PD2 data pipeline

This directory owns reproducible Project Diablo 2 source-data ingestion and minimal normalization.

## Upstream

The source is `coleestrin/pd2-tools`, pinned in `source.json` to exact commit `ff6ebbbf5510bd68cdd343b2d460a4bdd91609c4`.

That upstream commit is titled `feat: s14 (#45)` and switches the application default to Season 14. However, the skill tables available at the expected game-data path are still under **Season 13**; no `season-14/Skills.txt` / `SkillDesc.txt` pair was found there during Phase C. We explicitly label these inputs as Season 13.

## Commands

`npm run data:fetch` downloads the pinned `Skills.txt` and `SkillDesc.txt` inputs into ignored `pd2/raw/` and records provenance.

`npm run data:check` verifies the pinned files still exist and retain the minimum source schema.

`npm run data:normalize` converts the one Phase D target into `pd2/generated/poison-strike.json`.

`npm run data:test` fetches inputs, normalizes Poison Strike, verifies expected source-backed fields, and verifies byte-for-byte deterministic regeneration.

## Current scope

Phase D supports only the Necromancer skill represented internally by the Season 13 tables as `Poison Dagger`, ID 73. The normalized artifact preserves all non-empty source fields and formulas rather than interpreting uncertain Diablo data expressions.

See `docs/skill-schema.md` for the schema and naming boundary.
