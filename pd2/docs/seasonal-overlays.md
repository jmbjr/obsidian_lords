# Seasonal overlay schema v1

Seasonal overlays record later-season changes without rewriting older raw or normalized game-table data.

For the first vertical slice, an overlay contains:

- `schemaVersion`
- `targetSeason`
- `target` identity
- one or more `changes`

Each change records:

- stable local `id`
- `changeType` such as `behavior` or `numeric`
- concise `statement`
- source type/title/section/reference and a short source quote
- `confidence`
- optional `affectedSourceFields`
- `numericOverride`, which must remain `null` when the source supplies no replacement number

## Provenance boundary

Overlay facts do not become game-table facts. The Poison Strike normalized record now uses native Season 14 data from the pinned `pd2-tools` commit. The Season 14 overlay is retained as patch-note provenance, not as a delta applied to Season 13 tables. Native S14 stores the poison-pierce expression in `aurastatcalc1` rather than the old S13 `calc1` field.

Future overlay formats should not be generalized until additional real cases require it.
