import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(await readFile(join(root, "source.json"), "utf8"));
const outputDir = join(root, "raw");
const checkOnly = process.argv.includes("--check");

function rawUrl(path) {
  return `https://raw.githubusercontent.com/${config.repository}/${config.commit}/${path}`;
}

function validateTable(name, text, requiredColumns) {
  const [header, firstRow] = text.replaceAll("\r\n", "\n").split("\n");
  if (!header || !firstRow) throw new Error(`${name}: expected header and at least one data row`);
  const columns = header.split("\t");
  for (const column of requiredColumns) {
    if (!columns.includes(column)) throw new Error(`${name}: missing required column "${column}"`);
  }
  const rowColumns = firstRow.split("\t");
  if (rowColumns.length !== columns.length) {
    throw new Error(`${name}: first row has ${rowColumns.length} columns; header has ${columns.length}`);
  }
  return columns.length;
}

const provenance = { repository: config.repository, commit: config.commit, season: config.season, files: [] };

if (!checkOnly) {
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });
}

for (const file of config.files) {
  const response = await fetch(rawUrl(file.path));
  if (!response.ok) throw new Error(`${file.name}: upstream fetch failed (${response.status})`);
  const text = await response.text();
  const columns = validateTable(file.name, text, file.requiredColumns);
  provenance.files.push({ name: file.name, upstreamPath: file.path, columns });
  if (!checkOnly) await writeFile(join(outputDir, file.name), text);
}

if (checkOnly) {
  console.log(`Validated ${provenance.files.length} Season ${config.season} upstream tables at pinned commit ${config.commit}`);
} else {
  await writeFile(join(outputDir, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`);
  console.log(`Fetched ${provenance.files.length} Season ${config.season} tables from ${config.repository}@${config.commit}`);
}
