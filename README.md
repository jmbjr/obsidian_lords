# Obsidian Lords

Obsidian Lords is a guild site with a growing collection of tools for **Project Diablo 2 (PD2)**.

The repository intentionally keeps the public site, PD2 data/tooling, and project documentation separate so the guild site can grow without coupling its content to the game-data pipeline.

## Status

The project is being built incrementally from [roadmap issue #1](https://github.com/jmbjr/obsidian_lords/issues/1).

Phase A establishes only the repository and deployment foundation. PD2 data ingestion and skill parsing begin in later phases.

## Development

Requirements:

- Node.js 22
- npm

Install and verify:

```bash
npm install
npm run check
npm run build
```

Run the development server:

```bash
npm run dev
```

The production site is emitted to `dist/`.

## Repository layout

- `src/` — public static site source
- `pd2/` — future PD2 data ingestion, normalization, and analysis code
- `docs/` — project/process documentation
- `.github/workflows/` — CI and GitHub Pages deployment

See `PROCESSES.md` for the contribution workflow and `ROADMAP.md` for the current roadmap pointer.
