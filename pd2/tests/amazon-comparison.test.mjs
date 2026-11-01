import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { normalizeBuildSnapshot, compareAmazonBuilds, findAmazonDependencies, bonusForSkill, normalizeComparisonConfig, normalizeFullComparison } from "../../src/amazon-comparison.js";
const skills = JSON.parse(await readFile("pd2/generated/amazon-skills.json","utf8")).skills;
const empty = Object.fromEntries(skills.map(s=>[s.identity.internalId,0]));
const a={...empty,12:5,22:1}, b={...empty,12:20,22:5};
const snap=normalizeBuildSnapshot({version:1,level:55,budget:30,bonus:40,builds:[a,b]},skills);
assert.equal(snap.builds[1][12],20);
assert.deepEqual(snap.bonuses.map(b=>b.all),[40,40]);
assert.equal(normalizeBuildSnapshot({version:2,builds:[a,b]},skills),null);
assert.equal(normalizeBuildSnapshot({version:1,builds:[a]},skills),null);
assert.equal(normalizeBuildSnapshot({version:1,level:55,budget:1,bonus:0,builds:[a,b]},skills).budget,25);
const rows=compareAmazonBuilds(skills,[a,b],[40,40]);
const arrow=rows.find(r=>r.id===12&&r.label.startsWith("Arrow count"));
assert.equal(arrow.a,25);
assert.equal(arrow.b,25);
assert.equal(arrow.delta,0);
const dmg=rows.find(r=>r.id===12&&r.label.startsWith("Damage modifier"));
assert.equal(dmg.delta,60);
const magic=skills.find(s=>s.identity.internalId===6);
assert.ok(findAmazonDependencies(magic,skills).includes("Guided Arrow"));
const passives=compareAmazonBuilds(skills,[{...empty,9:5,33:5},{...empty,9:20,33:20}],[40,40]);
assert.equal(passives.find(r=>r.id===9).delta,3);
assert.equal(passives.find(r=>r.id===33).delta,null);
console.log("Build comparison, dependency references and snapshot validation passed");

// Phase 1: independent global bonuses, including legacy shared-bonus migration.
const same={...empty,12:20};
const independent=normalizeBuildSnapshot({version:1,level:62,budget:30,bonuses:[0,1],builds:[same,same]},skills);
assert.deepEqual(independent.bonuses.map(b=>b.all),[0,1]);
const compared=compareAmazonBuilds(skills,independent.builds,independent.bonuses);
assert.deepEqual(compared.filter(r=>r.id===12).map(r=>[r.a,r.b,r.delta]),[[24,25,1],[126,130,4],[122,128,6]]);
assert.deepEqual(normalizeBuildSnapshot(JSON.parse(JSON.stringify(independent)),skills).bonuses,independent.bonuses);

// Phase 2: tree and skill bonuses stack, and remain independent per build.
const scoped=normalizeBuildSnapshot({version:1,level:62,budget:30,bonuses:[{all:0,trees:{1:0},skills:{}},{all:1,trees:{1:2},skills:{12:3}}],builds:[same,same]},skills);
assert.equal(bonusForSkill(skills.find(s=>s.identity.internalId===12),scoped.bonuses[1]),6);
assert.equal(bonusForSkill(skills.find(s=>s.identity.internalId===9),scoped.bonuses[1]),1);
const scopedRows=compareAmazonBuilds(skills,scoped.builds,scoped.bonuses);
assert.equal(scopedRows.find(r=>r.id===12&&r.label.startsWith("Damage modifier")).delta,24);
assert.deepEqual(normalizeBuildSnapshot(JSON.parse(JSON.stringify(scoped)),skills).bonuses,scoped.bonuses);

const config=normalizeComparisonConfig({skillIds:[12,22,12]},skills);
assert.deepEqual(config.skillIds,[12,22]);
assert.equal(normalizeComparisonConfig({skillIds:[999999]},skills),null);
assert.equal(normalizeComparisonConfig({skillIds:["12"]},skills),null);
assert.equal(compareAmazonBuilds(skills,independent.builds,independent.bonuses,{skillIds:[]}).length,0);
assert.ok(compareAmazonBuilds(skills,independent.builds,independent.bonuses,config).every(r=>[12,22].includes(r.id)));
const full={format:"obsidian-lords-amazon-comparison",...independent,comparison:config};
const loaded=normalizeFullComparison(JSON.parse(JSON.stringify(full)),skills);
assert.deepEqual(loaded.comparison,config);
assert.deepEqual(loaded.builds,independent.builds);
assert.deepEqual(loaded.bonuses,independent.bonuses);
assert.equal(normalizeFullComparison({...full,comparison:{skillIds:[99999]}},skills),null);
