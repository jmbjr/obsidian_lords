// Source-grounded S14 Multiple Shot preview; explicit user inputs are NOT
// derived equipment or an inference that every arrow contacts a monster.
// Pinned reference: coleestrin/pd2-tools@7952f34719aa3a5cb41334a91fe36dbcbdd8be9c
// api/src/utils/effective-damage.ts chanceToHit; Skills.txt Multiple Shot.
const finite = (name, value, min=0) => {
  if (!Number.isFinite(value) || value < min) throw new RangeError(name);
  return value;
};
const clamp=(x,low,high)=>Math.max(low,Math.min(high,x));
export function pd2HitChance({attackRating,defense,attackerLevel,defenderLevel}) {
  let ar=finite("attackRating",attackRating);
  let def=finite("defense",defense);
  const level=finite("attackerLevel",attackerLevel,1);
  const targetLevel=finite("defenderLevel",defenderLevel,1);
  if (!Number.isInteger(level) || !Number.isInteger(targetLevel)) throw new RangeError("levels must be integers");
  const sum=ar+def, levels=level+targetLevel;
  const ratio=sum ? Math.trunc(111*ar/sum) : 100;
  let chance=Math.trunc(ratio*2*level/levels);
  if (chance>95) {
    let excess=ratio-Math.trunc(95*levels/(2*level));
    if(sum) excess=Math.trunc(Math.trunc(sum*excess/111)*90/sum);
    chance=95+Math.trunc(excess*2*level/levels);
  }
  return clamp(Math.trunc(chance),5,100)/100;
}
export function multipleShotBasicAttack({
  skillLevel, weaponMin, weaponMax, otherEnhancedDamagePercent=0,
  baseAttackRating, otherAttackRatingPercent=0, monsterDefense,
  attackerLevel, monsterLevel, targetBlockPercent=0,
}={}) {
  finite("skillLevel",skillLevel,1);
  if (!Number.isInteger(skillLevel)) throw new RangeError("skillLevel");
  finite("weaponMin",weaponMin);finite("weaponMax",weaponMax);
  if(weaponMin>weaponMax)throw new RangeError("weapon damage order");
  finite("otherEnhancedDamagePercent",otherEnhancedDamagePercent,-100);
  finite("baseAttackRating",baseAttackRating);
  finite("otherAttackRatingPercent",otherAttackRatingPercent,-100);
  finite("monsterDefense",monsterDefense);
  finite("targetBlockPercent",targetBlockPercent);
  if(targetBlockPercent>100)throw new RangeError("block");
  const skillDamagePercent=50+4*(skillLevel-1);
  const skillAttackRatingPercent=8+6*(skillLevel-1);
  const enhancedDamagePercent=skillDamagePercent+otherEnhancedDamagePercent;
  const attackRatingPercent=skillAttackRatingPercent+otherAttackRatingPercent;
  const attackRating=Math.max(0,baseAttackRating+Math.trunc(baseAttackRating*attackRatingPercent/100));
  const hitChance=pd2HitChance({attackRating,defense:monsterDefense,attackerLevel,defenderLevel:monsterLevel});
  return {
    arrows:Math.min(25,4+skillLevel),
    skillDamagePercent,skillAttackRatingPercent,
    enhancedDamagePercent,attackRatingPercent,attackRating,
    physicalMin:Math.max(0,Math.floor(weaponMin*(1+enhancedDamagePercent/100))),
    physicalMax:Math.max(0,Math.floor(weaponMax*(1+enhancedDamagePercent/100))),
    hitChance,
    landedChance:hitChance*(1-targetBlockPercent/100),
  };
}
