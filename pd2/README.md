# PD2 data ingestion

This directory owns reproducible Project Diablo 2 source-data ingestion. It does **not** interpret skill mechanics yet.

## Upstream

The source is `coleestrin/pd2-tools`, pinned in `source.json` to exact commit `ff6ebbbf5510bd68cdd343b2d460a4bdd91609c4`.

That upstream commit is titled `feat: s14 (#45)` and switches the application default to Season 14. However, the skill tables available at the expected game-data path are still under **Season 13**; no `season-14/Skills.txt` / `SkillDesc.txt` pair was found there during Phase C. We therefore explicitly label these inputs as Season 13 rather than implying they are S14 data.

## Fetch

Run `npm run data:fetch` to download only the two tables needed by the upcoming skill vertical slice: `Skills.txt` and `SkillDesc.txt`.

Downloads go to `pd2/raw/` with a generated `provenance.json`. That directory is derived input and is gitignored.

Run `npm run data:check` to verify the pinned files exist and retain the minimum table schema we depend on without writing them. CI runs this check.

## Boundaries

Phase C establishes provenance, retrieval, and minimum source-schema validation only. Parsing, normalization, formula interpretation, and Poison Strike-specific semantics belong to later phases.
