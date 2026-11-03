# On-demand PD2 character sync — GitHub-only

## Security and access

The [Sync PD2 character workflow](../.github/workflows/sync-pd2-character.yml) uses GitHub's authenticated **Run workflow** control. Initially only `github.actor == 'jmbjr'` can execute its jobs, even if another account gets repository write access. No GitHub API token is exposed to the public site, and the site does not dispatch workflows automatically.

The sync accepts one validated character name at a time. The server-side script fetches only `https://api.projectdiablo2.com/game/character/{name}`, checks response identity, and writes `public/armory/{lowercase-name}.json` with `_obsidianLordsSync.syncedAt` and source metadata.

**All published snapshots are publicly readable**, including character skills and raw item/equipment details from the official response. Do not run the workflow for a character whose data should not be republished. Confirm automated access and redistribution are permitted by PD2's API policies; the workflow does not bypass authentication or use private API credentials.

## Common workflow

1. Open the Amazon sandbox and enter a character name, for example `Magizon`.
2. Click **Request GitHub sync**. This opens the GitHub Actions workflow page; sign in as `jmbjr`, click **Run workflow**, select `main`, enter the **same character name**, then start the run.
3. Watch the run to ensure the **sync** and **deploy** jobs both succeed. The action fetches, validates and commits the public JSON, then builds and deploys Pages itself.
4. Return to the calculator and click **Load latest published JSON**. The browser reads the same-origin `/obsidian_lords/armory/magizon.json` with cache bypass and shows the sync timestamp. Retry if the new Pages deployment has not completed yet.
5. Import goes into the **currently selected Build A or B**. Only the existing supported Amazon skill and +skill fields are applied; raw gear is retained only during that browser session. The existing shared character-level field changes on import. Combat scenario inputs remain manual.

**Why the workflow deploys explicitly:** Changes made using the built-in `GITHUB_TOKEN` do not automatically trigger other workflows' `push` events. Publishing the JSON in the repository alone is insufficient. This workflow performs the Pages build and deployment after committing the data.

## Failure conditions and expectations

- Invalid name / mismatched response / upstream 4xx or malformed JSON: fail the sync without publishing a snapshot.
- No published snapshot (404): run the workflow first, or check successful deployment. No hidden fallback to the CORS-blocked PD2 API.
- Published stale timestamp: workflow not finished/deployed, old file still published, or Pages caching; refresh retries with a cache-busting URL.
- Build or deploy fails: the data may already have been committed but the live Pages site is not yet updated. Re-run the Pages deployment workflow if necessary.
- If the default branch later enforces PR-only protection, a GitHub Action's write to `main` may be rejected. This is deliberately not solved by granting a privileged personal token or bypassing protection; choose a reviewed alternative architecture.
- Existing manual **paste/upload JSON** flow remains available when GitHub Actions or PD2's API is unavailable.

No scheduled polling, external proxy, extra service account, or automatic token entry is introduced. The workflow uses a minimal owner-only gate, and no one-click anonymous trigger is exposed.
