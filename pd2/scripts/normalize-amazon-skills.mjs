import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const targets = [
  [6, "Magic Arrow"], [8, "Inner Sight"], [9, "Critical Strike"],
  [11, "Cold Arrow"], [12, "Multiple Shot"], [17, "Slow Movement"],
  [18, "Avoid"], [21, "Ice Arrow"], [22, "Guided Arrow"],
  [23, "Penetrate"], [26, "Strafe"], [29, "Evade"],
  [31, "Freezing Arrow"], [33, "Pierce"], [16, "Exploding Arrow"],
  [27, "Immolation Arrow"], [365, "Shattering Arrow"],
];
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
const records = targets.map(([id, name]) => {
  const matches = skills.filter((row) => row.Id === String(id) && row.skill === name && row.charclass === "ama");
  if (matches.length !== 1) throw new Error(`Expected exactly one Amazon skill ${name} (#${id})`);
  const row = matches[0];
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
  notes: ["Raw formulas are not evaluated.", "This is a curated exploration set, not a complete Amazon skill tree.", "Prerequisite and synergy meanings require independent verification before allocating points."],
  skills: records,
};
await mkdir(join(root, "generated"), { recursive: true });
await writeFile(join(root, "generated/amazon-skills.json"), JSON.stringify(result, null, 2) + "\n");
console.log(`Normalized ${records.length} Amazon skills from native Season ${source.season}`);
