# PD2 ladder Armory → Amazon sandbox import (initial vertical slice)

## Intended usage
Open Amazon skill sandbox, select **Build A** or **Build B**, choose **Import from PD2 Armory**, and enter a ladder character name (e.g. Magizon). Browser attempts a public GET to `https://api.projectdiablo2.com/game/character/<name>`, without cookies. If the browser cannot read it due to CORS, network policy, or server response, a **paste-the-JSON fallback** is offered.

This is a **real browser-side CORS experiment**, not a claimed verified live connection. The ChatGPT runtime could not resolve the API host; that does not establish a server-side block. A top-level link that works does **not** prove script access from GitHub Pages due to the browser's same-origin policy. To diagnose in production, use Chrome DevTools Network/Console, inspect the GET `Access-Control-Allow-Origin` header and response/error. Never use `mode:no-cors` (it returns unreadable opaque data), bypass browser protections, scrape login credentials, or use an unvetted public proxy. If CORS is denied, explore an expressly permitted server-side read-only API bridge or official PD2 CORS allowlisting (privacy, rate limits and server cost need review).

## Included in first slice
- Validates Amazon identity, character level, allocated skill IDs/hard points, and preserves current target Build A/B selection.
- Imports +Amazon class skills from **currently equipped player items**; tracks source equipment in memory and exposes warnings. No mercenary stats or weapon-switch items included.
- Recognizes raw DS, CB, OW chance, **OW Damage Per Second**, IAS, gear Pierce, attack rating, and current weapon damage as candidate data for later calculator integration. Those values are **not yet automatically applied to combat scratch controls**.
- Original Armory object remains in memory while sandbox page remains mounted, but is not written into persistent build snapshots or exported: **round-trip item support is not yet complete**. After page reload only supported skill points/bonuses survive existing storage.
- The existing sandbox has a **shared level across Builds A and B**; importing different-level characters changes that shared level and can affect the other build's level-dependent preview. This is explicitly a limitation to address in future build-fixture work.
- Inventory charms, item skills beyond +All Amazon, weapon/stat stacking, and item-derived physical damage interactions are preserved but *not interpreted*. Do not double count on-weapon ED or socketed runes.
- Import does not modify PD2, save files or your live ladder character.

## Next steps
1. Verify name-based import with Magizon in Chrome on live GitHub Pages: inspect status, CORS headers, and expected JSON.
2. Add fixture-schema version/provenance, source item retention/roundtrip, and per-build level + item stats.
3. Scope combat inputs per build, map all supported player equipment/charm modifiers with explicit stat derivation and warning reports, then compare true gear setups A/B.
4. Add file-based Armory import and optional permitted server-side bridge **only if** direct fetch fails in Chrome. Retain paste fallback.
5. Offline character export remains a separate lab-adapter milestone in #52.

The sample Magizon data used for tests is a deliberately **minimal derived fixture**, not an uploaded personal character inventory.
