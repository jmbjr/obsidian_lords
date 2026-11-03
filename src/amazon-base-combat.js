// Diablo II family Amazon Dexterity contributions, evaluated against the
// pinned Project Diablo 2 character snapshot. Evidence and limitations:
// docs/CHARACTER_BASE_AR_DEFENSE_M9B.md
// These are baseline components, not final selected-skill AR/defense with
// unmodeled buffs, aura multipliers, debuffs or runtime difficulty.
const stat = dex => Number.isInteger(dex) && dex>=0 && dex<=100000;
const unsupported = reason=>({value:null,status:"unavailable",sources:[],reason});
export function amazonDexterityAttackRating(dexterity,sources=[]) {
  if(!stat(dexterity))return unsupported("Effective Dexterity is unavailable or invalid");
  return {
    value:5*dexterity-30,status:"source-formula",
    sources:[...sources,{path:"rules.amazon.baseAttackRating",kind:"D2-family class constant",amount:-30}],
    formula:"5 × effective Dexterity − 30",
    reason:"Amazon level-one class constant +5; -(7 × 5). PD2 S14 regression validated against screenshot baseline",
  };
}
export function amazonDexterityDefense(dexterity,sources=[]) {
  if(!stat(dexterity))return unsupported("Effective Dexterity is unavailable or invalid");
  return {
    value:Math.floor(dexterity/4),status:"source-formula",
    sources:[...sources],
    formula:"floor(effective Dexterity / 4)",
    reason:"D2-family formula; verified numerically against pinned Magizon screenshot",
  };
}
export function baseAmazonCombatStats(dexterity,flatAttackRating,flatDefense,options={}) {
  const dexSources=options.dexteritySources||[];
  const attackRatingDex=amazonDexterityAttackRating(dexterity,dexSources);
  const defenseDex=amazonDexterityDefense(dexterity,dexSources);
  const valid=(x)=>Number.isFinite(x);
  const attackRating=attackRatingDex.value===null||!valid(flatAttackRating)?unsupported("Dexterity or selected flat attack rating unavailable"):{
    value:attackRatingDex.value+flatAttackRating,status:"partial",
    sources:[...attackRatingDex.sources,...(options.attackRatingSources||[])],
    formula:"Amazon dexterity base AR + selected flat attack rating",
    reason:"Base AR only; equipment percent, passive skills and attack-specific bonuses are excluded",
  };
  const defense=defenseDex.value===null||!valid(flatDefense)?unsupported("Dexterity or selected equipment defense unavailable"):{
    value:defenseDex.value+flatDefense,status:"partial",
    sources:[...defenseDex.sources,...(options.defenseSources||[])],
    formula:"floor(effective Dexterity / 4) + selected resolved equipment defense",
    reason:"Unmodified defense baseline; percentage defense, auras, buffs, curses and running state are excluded",
  };
  return {attackRatingDex,defenseDex,attackRating,defense};
}
