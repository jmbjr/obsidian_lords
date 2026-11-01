# Obsidian Lords

Obsidian Lords is a guild site with a growing collection of tools for **Project Diablo 2 (PD2)**.

The repository intentionally keeps the public site, PD2 data/tooling, and project documentation separate so the guild site can grow without coupling its content to the game-data pipeline.

## Status

The project is being built incrementally from [roadmap issue #1](https://github.com/jmbjr/obsidian_lords/issues/1).

The guild site, Season 14 data pipeline, Poison Strike explorer, and Amazon A/B skill sandbox are implemented. Remaining milestones and priorities are tracked in the single master roadmap issue.

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
- `pd2/` — PD2 data ingestion, normalization, and analysis code
- `docs/` — project/process documentation
- `.github/workflows/` — CI and GitHub Pages deployment

See `PROCESSES.md` for the contribution workflow and [issue #1](https://github.com/jmbjr/obsidian_lords/issues/1) for the sole active roadmap.
