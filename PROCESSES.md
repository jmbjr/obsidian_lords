# Development Process

## Source of truth

Repository files and GitHub issues/PRs are authoritative. Chat history is context, not specification.

## Change workflow

1. Start from current `main`.
2. Scope work to a roadmap phase or dedicated issue.
3. Create a focused branch.
4. Make the smallest coherent implementation that satisfies the issue acceptance criteria.
5. Run `npm run check` and `npm run build`.
6. Open a pull request describing scope, verification, and deliberate non-goals.
7. Review the PR independently before merge.
8. Merge only after required checks pass.

Avoid bundling unrelated cleanup or future roadmap phases into a PR.

## Generated and upstream data

Future PD2 data work must record provenance and keep raw upstream input separate from normalized/generated output. Do not silently turn uncertain game-data fields into asserted mechanics.
