import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { amazonCriticalStrikeChance } from "../../src/amazon-critical-strike.js";
import { emptyBonus } from "../../src/amazon-comparison.js";
import { previewAmazonSkill } from "../../src/amazon-formulas.js";

const data = JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8"));
const skill=data.skills.find(s=>s.identity.internalId===9);
const base=emptyBonus();

test("unlearned skill stays inactive despite global/tree +skills",()=>{
  assert.equal(amazonCriticalStrikeChance(skill,{}, {...base,all:12,trees:{...base.trees,2:20}}),0);
  assert.equal(amazonCriticalStrikeChance(skill,{},base),0);
});
test("learned passive feeds exactly the existing source-guarded preview",()=>{
  for(const [hard,all,tree,direct] of [[1,0,0,0],[10,0,0,0],[20,10,0,0],[5,2,3,4]]) {
    const bonuses={...emptyBonus(),all,trees:{...base.trees,2:tree},skills:{9:direct}};
    const expected=previewAmazonSkill(skill,hard,all+tree+direct,{9:hard})[0].value;
    assert.equal(amazonCriticalStrikeChance(skill,{9:hard},bonuses),expected);
  }
});
test("direct +Critical Strike grants effective passive with zero hard points",()=>{
  const bonuses={...emptyBonus(),all:1,skills:{9:6}};
  assert.equal(amazonCriticalStrikeChance(skill,{9:0},bonuses),
    previewAmazonSkill(skill,0,7,{},true)[0].value);
});
test("unsupported source expressions do not invent a critical chance",()=>{
  const mutated=structuredClone(skill);
  mutated.raw.skill.passivecalc1="unknown";
  assert.equal(amazonCriticalStrikeChance(mutated,{9:10},base),null);
  assert.equal(amazonCriticalStrikeChance(null,{9:10},base),null);
  assert.equal(amazonCriticalStrikeChance(skill,{9:21},base),null);
});
