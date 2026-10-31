// Explicitly supported S14 expressions only. No generic evaluation of game-table formulas.
// 'ln12' and 'ln56' are interpreted as linear Param1/2 and Param5/6 pairs.
// Results are previews, not authoritative in-game damage or DPS.
const n = (value) => Number(value);
const linear = (base, perLevel, level) => n(base) + (level - 1) * n(perLevel);
// D2 skillcalc dm12: truncate integer division at each stage; clamp to upper parameter.
// This is a documented D2-family evaluator interpretation, not PD2 engine verification.
export const diminishingDm12 = (level, min, max) => {
  const scale = Math.trunc(110 * level / (level + 6));
  return Math.min(max, min + Math.trunc(scale * (max - min) / 100));
};
// edmn reads elemental minimum damage; native level bands are 2–8, 9–16,
// 17–22, 23–28, and 29+. Pierce stores this value in its passive stat.
export const elementalMinByLevel = (row, level) => {
  if (!Number.isInteger(level) || level < 1) return null;
  const increments = [row.EMinLev1,row.EMinLev2,row.EMinLev3,row.EMinLev4,row.EMinLev5].map(n);
  const counts = [Math.min(Math.max(level-1,0),7),Math.min(Math.max(level-8,0),8),Math.min(Math.max(level-16,0),6),Math.min(Math.max(level-22,0),6),Math.max(level-28,0)];
  return n(row.EMin) + counts.reduce((sum,count,i)=>sum+count*increments[i],0);
};
export function previewAmazonSkill(skill, hardPoints, bonusSkills = 0, build = {}) {
  if (!skill || hardPoints <= 0) return [];
  const row = skill.raw.skill;
  const level = hardPoints + bonusSkills;
  if (skill.identity.internalId === 9 && row.passivecalc1 === "dm12" && row.passivestat1 === "passive_critical_strike") {
    return [{ label: "Critical Strike chance % (dm12 preview)", value: diminishingDm12(level, n(row.Param1), n(row.Param2)), expression: row.passivecalc1, assumption: "D2-family dm12 integer diminishing-return evaluator, capped at Param2; PD2 engine parity not verified" }];
  }
  if (skill.identity.internalId === 33 && row.passivecalc1 === "edmn" && row.passivestat1 === "skill_pierce") {
    return [{ label: "Pierce passive stat (edmn raw preview)", value: elementalMinByLevel(row, level), expression: row.passivecalc1, assumption: "edmn evaluates EMin and EMinLev1–5 by skill-level bands. Native passive stat is skill_pierce, but whether this raw value equals in-game pierce chance % is not engine-verified. Gear pierce not included." }];
  }
  if (skill.identity.internalId === 6 && row.EDmgSymPerCalc === "(skill('Inner Sight'.blvl)+skill('Slow Movement'.blvl)+skill('Guided Arrow'.blvl))*par8" && Number(row.Param8) === 20) {
    const points = [8,17,22].map(id => Number(build[id] || 0));
    if (points.every(value => Number.isInteger(value) && value >= 0 && value <= 20)) {
      return [{ label: "Magic damage synergy bonus % (EDmgSymPerCalc)", value: points.reduce((a,b)=>a+b,0) * Number(row.Param8), expression: row.EDmgSymPerCalc, assumption: "20% per hard point in Inner Sight, Slow Movement and Guided Arrow; bonus is not total damage" }];
    }
  }
  if (skill.identity.internalId === 12 && row.calc1 === '"min(25,ln12)"' && row.calc4 === "ln56") {
    return [
      { label: "Arrow count (calc1)", value: Math.min(25, linear(row.Param1, row.Param2, level)), expression: row.calc1, assumption: "ln12 = Param1 + (level − 1) × Param2" },
      { label: "Damage modifier % (calc4)", value: linear(row.Param5, row.Param6, level), expression: row.calc4, assumption: "ln56 = Param5 + (level − 1) × Param6; not total damage" },
    ];
  }
  if (skill.identity.internalId === 26 && row.calc1 === '"min(par3 + lvl - 1, par4)"' && row.calc2 === "ln12 + (skill('Penetrate'.blvl) * par8)") {
    const penetrate = Number(build[23] || 0);
    if (Number.isInteger(penetrate) && penetrate >= 0 && penetrate <= 20) {
      return [
        { label: "Strafe calc1 capped count", value: Math.min(n(row.Param3) + level - 1, n(row.Param4)), expression: row.calc1, assumption: "Native expression uses effective Strafe level; count interpretation not engine-verified" },
        { label: "Strafe calc2 modifier (source units)", value: linear(row.Param1, row.Param2, level) + penetrate * n(row.Param8), expression: row.calc2, assumption: "ln12 uses effective Strafe level; Penetrate.blvl uses hard points; source units, not total DPS" },
      ];
    }
  }
  if (skill.identity.internalId === 22 && row.calc1 === "ln34") {
    return [{ label: "Damage modifier % (calc1)", value: linear(row.Param3, row.Param4, level), expression: row.calc1, assumption: "ln34 = Param3 + (level − 1) × Param4; not total damage" }];
  }
  return [];
}
