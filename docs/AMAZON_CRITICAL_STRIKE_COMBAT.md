# Amazon Critical Strike → Multiple Shot combat scenario

This step connects the *existing* source-guarded Amazon Passive & Magic Critical Strike `dm12` preview to the per-target combat scenario. It does not replace the shared strike engine or assert new server-runtime behavior.

## Current behavior
- When **Use Build Critical Strike** is selected (default), active Build A or B supplies the value, based on Critical Strike hard points, +All, +Passive tree, and direct +Critical Strike bonuses using the same `bonusForSkill` logic as the skill inspector.
- An unlearned/ungranted passive yields **0%**, despite generic +All/+Tree bonuses. Direct +Critical Strike can grant it at zero hard points, matching established skill-sandbox handling.
- When automatic mode is off, the separate **manual Critical Strike %** entry is used. It remains intact when switching modes/builds.
- No changes to Deadly Strike, Crushing Blow, Open Wounds or target contact assumptions. The combat engine continues to combine CS/DS as mutually exclusive physical strike outcomes.
- Input source is the current build, **not** any inferred gear. Manual mode and combat scenarios remain scratch inputs rather than persisted build settings.

## Provenance and limitations
- [Pinned S14 Skills.txt](https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/game-data/pd2/season-14/Skills.txt): Amazon Critical Strike skill ID 9, `passivecalc1=dm12`, `passivestat1=passive_critical_strike`, `Param1=5`, `Param2=75`.
- [Existing Amazon formula preview](../src/amazon-formulas.js): source-guarded `diminishingDm12` evaluator. Its game-engine parity remains **unverified**, as already disclosed in the inspector.
- [Reusable combat effects](../src/combat-effects.js): Critical/Deadly outcomes are modeled as mutually exclusive, not independent additive multipliers.
- No automatic weapon stats, equipment DS, arrow geometry, target hit-count inference, attack cadence, or generalized total DPS. Build optimization roadmap: [#48](https://github.com/jmbjr/obsidian_lords/issues/48).
