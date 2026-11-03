import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importArmoryAmazon } from "../../src/pd2-armory.js";
import { projectAmazonRangedAttack } from "../../src/amazon-ranged-attack.js";
import { buildArmoryDebugAudit } from "../../src/amazon-armory-debug.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
const snapshot=load("magizon");
const audit=(payload=snapshot,settings={},override=null)=>{
  const imported=importArmoryAmazon(payload,skills,settings);
  const attack=projectAmazonRangedAttack(payload,skills,imported.build,imported.bonus,{
    ...settings,baseAttackRatingOverride:override,
  });
  return buildArmoryDebugAudit(payload,skills,imported.build,imported.bonus,settings,attack);
};
const byKey=(result,key)=>result.rows.find(x=>x.key===key);

test("latest live sync is used directly, with no historical screenshot timestamp gate",()=>{
  const report=audit();
  assert.equal(report.available,true);
  assert.equal(report.character,"Magizon");
  assert.equal(report.syncedAt,snapshot._obsidianLordsSync.syncedAt);
  assert.equal(report.level,snapshot.character.level);
  assert.equal(byKey(report,"level").armoryValue,snapshot.character.level);
  assert.equal(byKey(report,"strengthBase").armoryValue,snapshot.character.attributes.strength);
  assert.equal(byKey(report,"skillPoints").armoryValue,snapshot.character.points.skill);
  assert.equal(byKey(report,"stamina").armoryValue,snapshot.character.stamina);
  assert.equal(byKey(report,"level").status,"agrees");
  assert.ok(!JSON.stringify(report).includes("881"));
  assert.ok(report.rows.length>=40);
});

test("raw field values are compared with projected values only where the meanings match",()=>{
  const report=audit();
  const selected=byKey(report,"flatAttackRating");
  assert.equal(selected.armoryValue,selected.computedValue);
  assert.equal(selected.delta,0);
  assert.ok(selected.sources.some(s=>s.modifier==="tohit"));
  assert.ok(selected.sources.every(s=>s.sourcePath.startsWith("items[")));
  assert.equal(byKey(report,"ias").status,"agrees");
  assert.equal(byKey(report,"knownDefense").status,"agrees");
  const derived=byKey(report,"dexterityAR");
  assert.equal(derived.armoryValue,null);
  assert.equal(derived.status,"model-only");
  assert.equal(derived.delta,null);
  assert.equal(byKey(report,"multipleShotAR").armoryValue,null);
  assert.equal(byKey(report,"multipleShotAR").status,"model-only");
  assert.ok(byKey(report,"multipleShotAR").computedValue>0);
});

test("main versus switch, master gear and charms adjust current official source sums",()=>{
  const main=audit();
  const switchSet=audit(snapshot,{weaponSet:"switch"});
  const noCharms=audit(snapshot,{includeCharms:false});
  const allOff=audit(snapshot,{includeEquipment:false,includeCharms:false});
  assert.equal(switchSet.syncedAt,main.syncedAt);
  assert.notEqual(byKey(main,"ias").armoryValue,byKey(switchSet,"ias").armoryValue);
  assert.equal(byKey(noCharms,"strengthEquipped").delta,0);
  assert.equal(byKey(allOff,"flatAttackRating").armoryValue,0);
  assert.equal(byKey(allOff,"ias").armoryValue,0);
  assert.equal(byKey(allOff,"knownDefense").armoryValue,0);
  for (const result of [main,switchSet,noCharms,allOff])
    assert.ok(result.rows.filter(x=>x.kind==="matched-semantic").every(x=>x.status==="agrees"));
});

test("manual AR override affects only the computed estimate, not source JSON",()=>{
  const original=JSON.stringify(snapshot);
  const regular=audit();
  const overridden=audit(snapshot,{},400);
  assert.equal(byKey(overridden,"flatAttackRating").armoryValue,byKey(regular,"flatAttackRating").armoryValue);
  assert.notEqual(byKey(regular,"multipleShotAR").computedValue,byKey(overridden,"multipleShotAR").computedValue);
  assert.equal(byKey(overridden,"multipleShotAR").armoryValue,null);
  assert.equal(JSON.stringify(snapshot),original);
});

test("other imported Amazon receives its own official data, not Magizon's screenshot",()=>{
  const other=load("magiknaab");
  const report=audit(other);
  assert.equal(report.character,"Magiknaab");
  assert.equal(byKey(report,"level").armoryValue,other.character.level);
  assert.equal(byKey(report,"multipleShotAR").armoryValue,null);
  assert.equal(byKey(report,"multipleShotAR").delta,null);
});

test("mobile Debug uses a stacked source-versus-model layout with item paths",()=>{
  const code=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(code,/buildArmoryDebugAudit\(/);
  assert.match(code,/Debug · current Armory JSON vs calculated values/);
  assert.match(code,/data-armory-debug/);
  assert.match(code,/armory-debug-values/);
  assert.match(code,/Official JSON/);
  assert.match(code,/Inspect \$\{row\.sources\.length\} JSON source/);
  assert.doesNotMatch(code,/buildAmazonDebugComparison\(/);
  assert.doesNotMatch(code,/data-debug-parity/);
});
