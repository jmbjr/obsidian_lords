# Normalized skill schema v1

Phase D intentionally defines only the fields needed for the Poison Strike vertical slice.

## Top-level fields

- `schemaVersion` — version of this local normalized format.
- `identity` — stable identifiers copied/typed from the matching source rows.
- `source` — exact upstream repository, commit, season, and input paths.
- `selected` — a very small set of direct, low-interpretation fields converted to useful JSON types.
- `raw.skill` — every non-empty field from the matching `Skills.txt` row, preserving source strings/formulas verbatim.
- `raw.description` — every non-empty field from the matching `SkillDesc.txt` row, preserving source strings/formulas verbatim.

## Poison Strike naming

The pinned Season 13 source table identifies Necromancer skill ID 73 internally as `Poison Dagger`. Its display-name string key is `skillname73_PD2`. Phase D does not have the string table required to resolve that key, so the generated artifact does **not** assert a display name from the raw tables.

The file is named `poison-strike.json` because Poison Strike is the PD2 skill we are investigating, while `identity.internalName` faithfully retains the upstream internal name.

## Interpretation boundary

Codes such as `knif`, `sc9`, `pois`, and formulas such as `min(ln12, 50)` are preserved. Their human-readable meaning is not part of schema v1 unless independently sourced and added in a later phase.
