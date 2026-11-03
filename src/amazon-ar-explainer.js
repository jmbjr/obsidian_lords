// M9c: transparent explanation of the EXISTING M9b selected-skill AR model.
// This is an inspector, not a new theory of PD2 AR stacking.
const integer = n => Number.isInteger(n) && Number.isFinite(n);
export function explainAmazonAttackRating({
  dexterity,baseAR,baseSource="dexterity-derived",
  flatAR,gearARPercent,skillARPercent,skillLevel,hardPoints,
  skillLevelBonus,skillId=12,flatSources=[],percentSources=[],dexSources=[],
}={}) {
  const baseValid=integer(baseAR)&&baseAR>=0;
  const partsValid=[flatAR,gearARPercent].every(integer);
  const skillValid=skillId===12&&integer(skillLevel)&&skillLevel>0&&integer(skillARPercent);
  const skillFormula=skillValid?8+6*(skillLevel-1):null;
  const additiveBase=baseValid&&partsValid?baseAR+flatAR:null;
  const totalPercent=skillValid&&partsValid?skillARPercent+gearARPercent:null;
  const multiplier=totalPercent===null?null:(100+totalPercent)/100;
  const unrounded=additiveBase===null||multiplier===null?null:additiveBase*multiplier;
  const final=unrounded===null?null:Math.max(0,Math.trunc(unrounded));
  const isDerived=baseSource==="dexterity-derived";
  const derivedFormula=isDerived&&integer(dexterity)?5*dexterity-30:null;
  return {
    status:final===null?"unavailable":"partial",
    value:final,
    skillId,skillLevel,hardPoints,skillLevelBonus,
    dexterity,baseAR,baseSource,derivedFormula,
    flatAR,gearARPercent,skillARPercent,skillFormula,
    additiveBase,totalPercent,multiplier,unrounded,
    dexSources,flatSources,percentSources,
    equation:"max(0, trunc((baseAR + flatAR) × (100 + skillAR% + equipmentAR%) / 100))",
    limitations:[
      "D2-family Amazon Dexterity base AR: 5 × DEX − 30. Only applies automatically when baseSource is dexterity-derived.",
      "Multiple Shot percentage from the pinned S14 skill formula: 8 + 6 × (effective level − 1).",
      "The combined skill/equipment percentage ordering is the current provisional M9b formula, not independently verified PD2 final AR.",
      "Other skill, passive, aura, state or conditional AR modifiers may be missing. The result must not be treated as the in-game AR value.",
    ],
    internalCheck:skillValid&&skillARPercent!==skillFormula?
      "The supplied skill AR% does not match the M9b Multiple Shot formula; inspect inputs":"",
  };
}
