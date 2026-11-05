import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { importArmoryAmazon } from "../../src/pd2-armory.js";
import { projectAmazonRangedAttack } from "../../src/amazon-ranged-attack.js";
import { buildArmoryDebugAudit, ARMORY_DEBUG_TIERS } from "../../src/amazon-armory-debug.js";

const skills=JSON.parse(readFileSync("pd2/generated/amazon-skills.json","utf8")).skills;
const load=name=>JSON.parse(readFileSync(`public/armory/${name}.json`,"utf8"));
// Keep historical source-sum expectations immutable as the public character sync changes.
const liveSnapshot=load("magizon");
const snapshot=JSON.parse(readFileSync("pd2/fixtures/character-parity/magizon-2026-11-03-pinned.json","utf8"));
const audit=(payload=snapshot,settings={},override=null)=>{
  const imported=importArmoryAmazon(payload,skills,settings);
  const attack=projectAmazonRangedAttack(payload,skills,imported.build,imported.bonus,{
    ...settings,baseAttackRatingOverride:override,
  });
  return buildArmoryDebugAudit(payload,skills,imported.build,imported.bonus,settings,attack);
};
const byKey=(result,key)=>result.rows.find(x=>x.key===key);

test("latest live sync is used directly, with no historical screenshot timestamp gate",()=>{
  const report=audit(liveSnapshot);
  assert.equal(report.available,true);
  assert.equal(report.character,"Magizon");
  assert.equal(report.syncedAt,liveSnapshot._obsidianLordsSync.syncedAt);
  assert.equal(report.level,liveSnapshot.character.level);
  assert.equal(byKey(report,"level").armoryValue,liveSnapshot.character.level);
  assert.equal(byKey(report,"strengthBase").armoryValue,liveSnapshot.character.attributes.strength);
  assert.equal(byKey(report,"skillPoints").armoryValue,liveSnapshot.character.points.skill);
  assert.equal(byKey(report,"stamina").armoryValue,liveSnapshot.character.stamina);
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
    assert.deepEqual(result.rows.filter(x=>x.kind==="matched-semantic"&&x.status==="differs").map(x=>({key:x.key,raw:x.armoryValue,computed:x.computedValue})),[]);
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
  assert.match(code,/Direct official JSON field/);
  assert.match(code,/Independent JSON source sum/);
  assert.match(code,/Calculation tier:/);
  assert.match(code,/Inspect \$\{row\.sources\.length\} JSON source/);
  assert.doesNotMatch(code,/buildAmazonDebugComparison\(/);
  assert.doesNotMatch(code,/data-debug-parity/);
});

test("Milestone 10: every live Debug row has a meaningful computation tier",()=>{
  const report=audit();
  assert.deepEqual(Object.keys(ARMORY_DEBUG_TIERS),["raw","aggregation","baseFormula","skillEstimate"]);
  assert.ok(report.rows.length>40);
  for(const row of report.rows) {
    assert.ok(Object.hasOwn(ARMORY_DEBUG_TIERS,row.calculationTier),row.key);
    assert.ok(ARMORY_DEBUG_TIERS[row.calculationTier].description.length>20);
  }
  assert.equal(byKey(report,"level").calculationTier,"raw");
  assert.equal(byKey(report,"multipleShotHard").calculationTier,"raw");
  assert.equal(byKey(report,"weaponmin").calculationTier,"raw");
  assert.equal(byKey(report,"flatAttackRating").calculationTier,"aggregation");
  assert.equal(byKey(report,"knownDefense").calculationTier,"aggregation");
  assert.equal(byKey(report,"dexterityEffective").calculationTier,"aggregation");
  assert.equal(byKey(report,"dexterityAR").calculationTier,"baseFormula");
  assert.equal(byKey(report,"baseAR").calculationTier,"baseFormula");
  assert.equal(byKey(report,"multipleShotLevel").calculationTier,"aggregation");
  for(const key of ["multipleShotAR","multipleShotSkillArPercent","multipleShotPhysicalMin","attackFrames"])
    assert.equal(byKey(report,key).calculationTier,"skillEstimate",key);
});

test("Milestone 10: Magizon 323 is independently reconstructed, not a direct JSON field",()=>{
  const report=audit();
  const ar=byKey(report,"flatAttackRating");
  const dex=byKey(report,"dexterityAR");
  const base=byKey(report,"baseAR");
  assert.equal(ar.armoryValue,53);
  assert.equal(ar.computedValue,53);
  assert.equal(dex.computedValue,270);
  assert.equal(base.computedValue,323);
  assert.equal(base.armoryValue,null);
  assert.equal(base.delta,null);
  assert.equal(base.status,"model-only");
  assert.ok(base.sources.some(x=>x.sourcePath?.startsWith("items[")));
  assert.ok(base.sources.some(x=>x.sourcePath?.includes("attributes")||x.path?.includes("attributes")));
  assert.ok(!JSON.stringify(snapshot).includes('"baseAttackRating":323'));
});

test("Milestone 10: intermediate tiers survive selection and manual override",()=>{
  const main=audit();
  const noCharms=audit(snapshot,{includeCharms:false});
  const noEquipment=audit(snapshot,{includeEquipment:false,includeCharms:false});
  const override=audit(snapshot,{},400);
  for(const report of [main,noCharms,noEquipment,override]) {
    assert.equal(byKey(report,"flatAttackRating").calculationTier,"aggregation");
    assert.equal(byKey(report,"baseAR").calculationTier,"baseFormula");
    assert.equal(byKey(report,"multipleShotAR").calculationTier,"skillEstimate");
    assert.equal(byKey(report,"baseAR").armoryValue,null);
  }
  assert.notEqual(byKey(noCharms,"flatAttackRating").computedValue,byKey(main,"flatAttackRating").computedValue);
  assert.equal(byKey(noEquipment,"flatAttackRating").computedValue,0);
  assert.equal(byKey(override,"baseAR").computedValue,453);
});

test("Milestone 10: mobile Debug renders provenance labels without inventing official totals",()=>{
  const code=readFileSync("src/amazon-sandbox.js","utf8");
  assert.match(code,/armoryDebug\.calculationTiers\[row\.calculationTier\]\.label/);
  assert.match(code,/Direct JSON total \(not published\)/);
  assert.match(code,/Independent JSON source sum/);
  assert.match(code,/Delta|Δ model − comparable source/);
  assert.match(code,/Inspect \$\{row\.sources\.length\} JSON source/);
});
