import test from "node:test";
import assert from "node:assert/strict";
import { compareMarginalEffects } from "../../src/multishot-marginal.js";

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const byId=(result,id)=>result.changes.find(x=>x.id===id);

test("critical upgrade and DS alternative use mutually exclusive physical outcomes",()=>{
  const r=compareMarginalEffects({
    landedHitsInWindow:2,physicalDamagePerHit:100,
    criticalChance:50,deadlyChance:40,nextHardPointCriticalChance:60,
    crushingChance:20,openWoundsChance:20,currentTargetLife:12000,attackerLevel:55,
  });
  close(r.baseline.physicalDamage,340);
  close(byId(r,"critical").delta.physicalDamage,12);
  close(byId(r,"deadly").delta.physicalDamage,10);
  close(byId(r,"critical").delta.crushingDamageAtFixedLife,0);
  close(byId(r,"deadly").delta.openWoundsBleedDps,0);
});
test("CB compares current-life contribution separately from OW steady bleed",()=>{
  const r=compareMarginalEffects({landedHitsInWindow:2,physicalDamagePerHit:100,
    crushingChance:20,openWoundsChance:20,currentTargetLife:12000,attackerLevel:55});
  close(byId(r,"crushing").delta.crushingDamageAtFixedLife,200);
  close(byId(r,"crushing").delta.physicalDamage,0);
  assert.ok(byId(r,"wounds").delta.openWoundsBleedDps>0);
  close(byId(r,"wounds").delta.crushingDamageAtFixedLife,0);
});
test("absent CS skill point is unavailable; percentage upgrades cap at 100",()=>{
  const r=compareMarginalEffects({landedHitsInWindow:5,deadlyChance:100,crushingChance:100,
    openWoundsChance:100,attackerLevel:55});
  assert.equal(byId(r,"critical").available,false);
  for(const id of ["deadly","crushing","wounds"]){
    assert.equal(byId(r,id).afterChance,100);
    for(const delta of Object.values(byId(r,id).delta)) close(delta,0);
  }
});
test("zero landed hits yields no upgrade contribution, and invalid inputs reject",()=>{
  const r=compareMarginalEffects({landedHitsInWindow:0,physicalDamagePerHit:200,
    nextHardPointCriticalChance:10,attackerLevel:55});
  for(const row of r.changes) for(const d of Object.values(row.delta))close(d,0);
  assert.throws(()=>compareMarginalEffects({deadlyChance:120}),RangeError);
});
