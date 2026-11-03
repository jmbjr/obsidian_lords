// Server-side PD2 Armory sync for explicitly authorized GitHub workflow_dispatch.
// Never execute in browser; downloaded JSON is committed to public/armory.
// Usage: ARMORY_CHARACTER=Magizon node pd2/scripts/sync-armory-character.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { armoryCharacterUrl } from "../../src/pd2-armory.js";

export const validCharacterName = value =>
  typeof value === "string" && /^[A-Za-z][A-Za-z0-9_-]{1,23}$/.test(value);

export const publicArmoryPath = value => {
  if (!validCharacterName(value)) throw new Error("Invalid character name: use 2-24 ASCII letters/numbers, underscore or hyphen, starting with a letter");
  return join("public", "armory", `${value.toLowerCase()}.json`);
};

export async function syncArmoryCharacter(name, { fetchImpl = fetch, now = () => new Date().toISOString(), save = writeFile, makeDirectory = mkdir } = {}) {
  const path = publicArmoryPath(name);
  const response = await fetchImpl(armoryCharacterUrl(name), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`PD2 API returned HTTP ${response.status}`);
  const contentType = response.headers?.get?.("content-type") || "";
  if (contentType && !contentType.includes("json")) throw new Error("PD2 API returned non-JSON content type");
  const body = await response.text();
  if (body.length > 2_000_000) throw new Error("PD2 payload exceeds safe publication size");
  let payload;
  try { payload = JSON.parse(body); }
  catch { throw new Error("PD2 response was not valid JSON"); }
  if (!payload || !Array.isArray(payload.items) || !payload.character ||
      typeof payload.character.name !== "string" ||
      payload.character.name.toLowerCase() !== name.toLowerCase()) {
    throw new Error("PD2 response missing character/items or returned a different character");
  }
  const saved = {
    ...payload,
    _obsidianLordsSync: {
      character: payload.character.name,
      syncedAt: now(),
      source: armoryCharacterUrl(name),
    },
  };
  await makeDirectory(join("public", "armory"), { recursive: true });
  await save(path, JSON.stringify(saved, null, 2) + "\n", "utf8");
  return { path, syncedAt: saved._obsidianLordsSync.syncedAt };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const name = process.env.ARMORY_CHARACTER || "";
  try {
    const {path, syncedAt} = await syncArmoryCharacter(name);
    console.log(`Published ${path} at ${syncedAt}`);
  } catch (error) {
    console.error(`Character sync failed: ${error.message}`);
    process.exitCode = 1;
  }
}
