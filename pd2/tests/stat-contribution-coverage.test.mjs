import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const fixture=JSON.parse(readFileSync(new URL('../fixtures/stat-coverage/magizon-level70-coverage.json',import.meta.url),'utf8'));
const find=k=>fixture.rows.find(x=>x.key===k);
test('M12 inventory: unique, sourced, classified field/subfield keys',()=>{
 assert.equal(fixture.schemaVersion,1);
 assert.ok(fixture.rows.length>=100);
 assert.equal(new Set(fixture.rows.map(x=>x.key)).size,fixture.rows.length);
 for(const row of fixture.rows){
   assert.ok(['character-screen','extended'].includes(row.screen),row.key);
   assert.ok(['raw','formula-derived','partial','known-omission','gap'].includes(row.status),row.key);
   assert.ok(row.producer && row.gap && row.sourceCategories.length,row.key);
 }
});
test('M12 inventory: Penetrate and passive Pierce must never be silently complete',()=>{
 for(const k of ['character.attack1Rating','character.attack2Rating','extended.projectilePierce']){
  assert.equal(find(k)?.status,'known-omission',k);
 }
 assert.match(find('character.attack1Rating').gap,/Penetrate/);
 assert.match(find('extended.projectilePierce').gap,/passive Pierce/);
});
test('M12 observed arithmetic and weapon slot context are captured without pretending model parity',()=>{
 assert.match(fixture.snapshot.mainHands,/4 Short Bow.*5 Blunt Arrows/);
 assert.match(fixture.snapshot.alternateHands,/11 Harmony.*12 Blunt Arrows/);
 const short=fixture.observations.find(o=>o.scenario==='short-bow-normal-attack');
 const multi=fixture.observations.find(o=>o.scenario==='multiple-shot-with-harmony');
 assert.equal(Math.trunc(short.baseAR*(1+short.percentContributions.reduce((n,x)=>n+x.amount,0)/100)),short.observedAR);
 assert.equal(Math.trunc(multi.baseAR*(1+multi.percentContributions.reduce((n,x)=>n+x.amount,0)/100)),multi.observedAR);
});
test('M12 inventory: every first-screen category and extended component family has entries',()=>{
 const keys=new Set(fixture.rows.map(x=>x.key));
 for(const key of ['character.nextLevelXp','character.lifeCurrent','character.lifeMaximum','character.attack1DamageMin','character.attack2Rating','character.defense','character.fireResist','extended.curseLength','extended.magicAbsorbPercent','extended.physicalPierce','extended.baseArDex','extended.attackFrames','extended.iasThresholds','extended.openWoundsChance','extended.openWoundsDps','extended.criticalStrikeChance','extended.projectilePierce','extended.poisonDuration','extended.stashGold','extended.xpProgress'])assert.ok(keys.has(key),key);
});
