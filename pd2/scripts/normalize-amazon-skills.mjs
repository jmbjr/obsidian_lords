import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
// Include every playable Amazon class skill, excluding internal placeholder rows.
const excludedInternalIds = new Set([372, 379]);
function parseTsv(text) {
  const [header, ...lines] = text.replaceAll("\r\n", "\n").trimEnd().split("\n");
  const columns = header.split("\t");
  return lines.map((line) => {
    const values = line.split("\t");
    if (values.length > columns.length) throw new Error(`Malformed TSV row: ${values.length} values exceed ${columns.length} columns`);
    // Upstream SkillDesc.txt contains a final row with omitted trailing empty cells.
    // Match the existing Poison Strike parser: missing trailing fields are empty.
    return Object.fromEntries(columns.map((key, i) => [key, values[i] ?? ""]));
  });
}
const [skillsText, descriptionsText, provenanceText] = await Promise.all([
  readFile(join(root, "raw/Skills.txt"), "utf8"),
  readFile(join(root, "raw/SkillDesc.txt"), "utf8"),
  readFile(join(root, "raw/provenance.json"), "utf8"),
]);
const source = JSON.parse(provenanceText);
if (source.season !== 14) throw new Error("Amazon slice requires native Season 14 tables");
const skills = parseTsv(skillsText);
const descriptions = parseTsv(descriptionsText);
const playable = skills.filter((row) => row.charclass === "ama" && !excludedInternalIds.has(Number(row.Id)) && row.maxlvl !== "");
if (playable.length !== 31) throw new Error(`Expected 31 playable Amazon skills, got ${playable.length}`);
const records = playable.map((row) => {
  const id = Number(row.Id);
  const name = row.skill;
  if (!Number.isInteger(id)) throw new Error(`Invalid Amazon skill ID: ${row.Id}`);
  const descMatches = descriptions.filter((d) => d.skilldesc === row.skilldesc);
  if (descMatches.length !== 1) throw new Error(`Expected exactly one description for ${name}`);
  const desc = descMatches[0];
  const nonempty = (obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== ""));
  const level = Number(row.reqlevel);
  const max = Number(row.maxlvl);
  if (!Number.isInteger(level) || !Number.isInteger(max) || max < 1) throw new Error(`Invalid levels for ${name}`);
  return {
    identity: { internalId: id, internalName: name, classCode: "ama", descriptionKey: row.skilldesc, displayNameStringKey: desc["str name"] },
    selected: { requiredLevel: level, maxLevel: max, skillPage: desc.SkillPage, skillRow: desc.SkillRow, skillColumn: desc.SkillColumn },
    raw: { skill: nonempty(row), description: nonempty(desc) },
  };
});
const result = {
  schemaVersion: 1,
  source: { repository: source.repository, commit: source.commit, season: source.season, files: source.files.map(({ name, upstreamPath }) => ({ name, upstreamPath })) },
  notes: ["Raw formulas are not evaluated.", "All 31 playable Amazon skills are included; internal placeholder rows are excluded.", "Prerequisite and synergy meanings require independent verification before allocating points."],
  skills: records,
};
await mkdir(join(root, "generated"), { recursive: true });
await writeFile(join(root, "generated/amazon-skills.json"), JSON.stringify(result, null, 2) + "\n");
console.log(`Normalized ${records.length} Amazon skills from native Season ${source.season}`);
