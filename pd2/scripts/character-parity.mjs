// Run the M8 parity audit against the currently published, source-pinned
// Magizon snapshot. stdout is a tabular Markdown report (no raw item JSON).
import { readFileSync } from "node:fs";
import { buildAmazonParityObservations } from "../../src/amazon-parity.js";

const snapshotPath=process.argv[2]||"public/armory/magizon.json";
const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const payload=JSON.parse(readFileSync(snapshotPath,"utf8"));
const parity=buildAmazonParityObservations(payload,skills);
const asText=x=>x===null?"—":String(x).replaceAll("|","/");
const lines=[
  "# Magizon M8 parity audit",
  "",
  `Source: ${snapshotPath} · synced: ${parity.actualSnapshot||"unknown"}`,
  `Reference pinned to ${parity.expectedSnapshot}. Snapshot match: **${parity.pinned?"yes":"NO — all comparisons invalid until reference is updated"}**.`,
  "",
  `Status counts: ${Object.entries(parity.counts).map(([k,v])=>`${k}=${v}`).join(", ")}`,
  "",
  "| Screen | Field | Observed | Modeled | Numeric gap | Classification |",
  "|---|---|---:|---:|---:|---|",
  ...parity.rows.map(r=>`| ${r.view} | ${r.label} | ${asText(r.observed)} | ${asText(r.modeled)} | ${asText(r.numericGap)} | ${r.verdict} |`),
  "",
  "## Source evidence for candidate charm reconciliations",
  "",
  ...parity.rows.filter(r=>r.candidateCharmEvidence.length).map(r=>
    `- ${r.label}: ${r.candidateCharmEvidence.map(c=>`${c.item} (${c.amount>=0?"+":""}${c.amount}, ${c.sourcePath})`).join("; ")}. ${r.candidateReconciles?"**Numerically reconciles**": "Does not fully reconcile"}. *Activation remains unverified.*`),
  "",
  "## Unverified and unavailable formulas",
  "",
  ...parity.rows.filter(r=>r.verdict==="unavailable"||r.verdict==="partial").map(r=>
    `- ${r.label}: ${r.explanation}`),
  "",
  "## Caveats",...parity.caveats.map(x=>"- "+x),
];
process.stdout.write(lines.join("\n")+"\n");
if(!parity.pinned)process.exitCode=2;
