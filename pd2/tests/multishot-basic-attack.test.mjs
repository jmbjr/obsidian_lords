import test from "node:test";
import assert from "node:assert/strict";
import { pd2HitChance, multipleShotBasicAttack } from "../../src/multishot-basic-attack.js";

test("S14 level 1/20/21/40 damage, AR and arrow metrics", () => {
  for (const [level,arrows,ed,ar] of [[1,5,50,8],[20,24,126,122],[21,25,130,128],[40,25,206,242]]) {
    const r=multipleShotBasicAttack({skillLevel:level,weaponMin:100,weaponMax:200,baseAttackRating:1000,monsterDefense:1000,attackerLevel:55,monsterLevel:55});
    assert.equal(r.arrows,arrows);
    assert.equal(r.skillDamagePercent,ed);
    assert.equal(r.skillAttackRatingPercent,ar);
    assert.equal(r.physicalMin,Math.floor(100*(1+ed/100)));
    assert.equal(r.physicalMax,Math.floor(200*(1+ed/100)));
    assert.equal(r.attackRating,1000+Math.trunc(1000*ar/100));
  }
});
test("other ED and AR are additive within their bonus categories, not separately multiplied",()=>{
  const r=multipleShotBasicAttack({skillLevel:1,weaponMin:100,weaponMax:200,otherEnhancedDamagePercent:100,baseAttackRating:1000,otherAttackRatingPercent:100,monsterDefense:1000,attackerLevel:55,monsterLevel:55});
  assert.equal(r.physicalMin,250);
  assert.equal(r.physicalMax,500);
  assert.equal(r.attackRating,2080);
});
test("PD2 chance-to-hit handles extreme AR, defense, levels and target block",()=>{
  assert.equal(pd2HitChance({attackRating:0,defense:2000,attackerLevel:55,defenderLevel:55}),.05);
  assert.equal(pd2HitChance({attackRating:100000000,defense:0,attackerLevel:55,defenderLevel:55}),1);
  const r=multipleShotBasicAttack({skillLevel:1,weaponMin:100,weaponMax:100,baseAttackRating:1000,monsterDefense:1000,attackerLevel:55,monsterLevel:55,targetBlockPercent:20});
  assert.ok(Math.abs(r.landedChance-r.hitChance*.8)<1e-12);
});
test("reject impossible damage, levels and percent fields",()=>{
  const base={skillLevel:20,weaponMin:100,weaponMax:200,baseAttackRating:1000,monsterDefense:1000,attackerLevel:55,monsterLevel:55};
  assert.throws(()=>multipleShotBasicAttack({...base,weaponMin:300}),RangeError);
  assert.throws(()=>multipleShotBasicAttack({...base,skillLevel:0}),RangeError);
  assert.throws(()=>multipleShotBasicAttack({...base,targetBlockPercent:101}),RangeError);
  assert.throws(()=>multipleShotBasicAttack({...base,monsterLevel:0}),RangeError);
});
