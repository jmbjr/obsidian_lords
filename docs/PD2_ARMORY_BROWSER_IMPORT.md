# PD2 Armory imports on GitHub Pages

The official PD2 Armory endpoint (`https://api.projectdiablo2.com/game/character/{name}`) can be navigated to directly in a browser, but its responses currently do **not** include `Access-Control-Allow-Origin` for this site's origin. Browser JavaScript `fetch()` is therefore blocked by CORS, even though the URL opens in a tab.

## Browser workflow (no proxy)
1. Enter the character name in the Amazon sandbox Armory section and choose **Open official character JSON**.
2. In the separate official API tab, select and copy the entire JSON document.
3. Return to the sandbox and paste into **Character JSON**, then choose **Import pasted JSON**. Alternatively save the JSON to a local file and use **Or upload JSON file**.
4. The selected Build A or B receives the parsed hard skill points and supported bonuses. The same existing importer validates the payload before changing the build; other build and manual combat scenario are unaffected.

The application does **not** contact a third-party CORS proxy or place character data into a query string. Parsed raw gear is kept only in session memory; the persisted build snapshot is unchanged. The pure `fetchArmoryCharacter` helper remains available for backend tools or sites whose server provides CORS access, but the static GitHub Pages UI does not call it.

Automatic in-page imports require PD2 to allow the Pages origin with CORS headers, or a trusted server-side proxy/cache. `mode: no-cors` cannot work because it produces an unreadable response.
