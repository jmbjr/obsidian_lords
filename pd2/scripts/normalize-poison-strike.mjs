import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawDir = join(root, "raw");
const outDir = join(root, "generated");

function parseTsv(text) {
  const lines = text.replaceAll("\r\n", "\n").trimEnd().split("\n");
  const headers = lines[0].split("\t");
  return lines.slice(1).map((line) => {
    const values = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function nonEmptyFields(row) {
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== ""));
}

const [skillsText, descriptionsText, provenanceText] = await Promise.all([
  readFile(join(rawDir, "Skills.txt"), "utf8"),
  readFile(join(rawDir, "SkillDesc.txt"), "utf8"),
  readFile(join(rawDir, "provenance.json"), "utf8"),
]);

const skills = parseTsv(skillsText);
const descriptions = parseTsv(descriptionsText);
const source = JSON.parse(provenanceText);

const skillRow = skills.find((row) => row.Id === "73" && row.skill === "Poison Dagger" && row.charclass === "nec");
if (!skillRow) throw new Error("Expected Necromancer Poison Dagger internal row (Id 73) was not found");

const descriptionRow = descriptions.find((row) => row.skilldesc === skillRow.skilldesc);
if (!descriptionRow) throw new Error(`Description row "${skillRow.skilldesc}" was not found`);

const normalized = {
  schemaVersion: 1,
  identity: {
    internalName: skillRow.skill,
    internalId: Number(skillRow.Id),
    classCode: skillRow.charclass,
    descriptionKey: skillRow.skilldesc,
    displayNameStringKey: descriptionRow["str name"],
  },
  source: {
    repository: source.repository,
    commit: source.commit,
    season: source.season,
    files: source.files.map(({ name, upstreamPath }) => ({ name, upstreamPath })),
  },
  selected: {
    requiredLevel: Number(skillRow.reqlevel),
    maxLevel: Number(skillRow.maxlvl),
    rangeCode: skillRow.range,
    allowedItemTypeCodes: [skillRow.itypea1, skillRow.itypea2].filter(Boolean),
    elementTypeCode: skillRow.EType,
  },
  raw: {
    skill: nonEmptyFields(skillRow),
    description: nonEmptyFields(descriptionRow),
  },
};

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "poison-strike.json"), `${JSON.stringify(normalized, null, 2)}\n`);
console.log(`Normalized internal skill ${normalized.identity.internalName} (ID ${normalized.identity.internalId}) from Season ${source.season}`);
