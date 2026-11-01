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
export function previewAmazonSkill(skill, hardPoints, bonusSkills = 0, build = {}, grantedBySkillBonus = false) {
  if (!skill || (hardPoints <= 0 && !grantedBySkillBonus)) return [];
  const row = skill.raw.skill;
  const level = hardPoints + bonusSkills;
  // Native S14 Bow & Crossbow source-table previews. Each metric is independently
  // guarded by its expression and parameters; no generic expression evaluator.
  const bow = skill.selected.skillPage === "1";
  const result = [];
  const metric = (label,value,expression,assumption) => result.push({label,value,expression,assumption});
  if (bow && ({6:["10","9"],7:["10","10"],11:["10","10"],16:["20","10"],21:["20","10"],27:["30","9"],31:["40","10"]}[skill.identity.internalId] || []).join(":") === [row.ToHit,row.LevToHit].join(":")) {
    metric("Attack rating bonus % (ToHit/LevToHit)",linear(row.ToHit,row.LevToHit,level),"ToHit + (level − 1) × LevToHit","Native S14 table linear preview; not final attack rating or in-game verified");
  }
  const synergy = (expected, params) => {
    if (row.EDmgSymPerCalc !== expected) return;
    const values = params.map(([id,param]) => [Number(build[id] || 0), Number(row["Param"+param])]);
    if (values.some(([points,percent]) => !Number.isInteger(points) || points < 0 || points > 20 || !Number.isFinite(percent))) return;
    metric("Elemental damage synergy bonus % (EDmgSymPerCalc)",values.reduce((total,[points,percent])=>total+points*percent,0),row.EDmgSymPerCalc,"Native S14 synergy expression; hard points only; bonus %, not total damage or in-game verified");
  };
  if (bow) {
    switch(skill.identity.internalId) {
      case 6:
        synergy("(skill('Inner Sight'.blvl)+skill('Slow Movement'.blvl)+skill('Guided Arrow'.blvl))*par8",[[8,8],[17,8],[22,8]]);
        break;
      case 7:
        if (row.calc1 === '"min(14,2+(lvl/par2))"' && row.Param2 === "3") metric("Fire Arrow projectile count (calc1 preview)",Math.min(14,2+Math.trunc(level/3)),row.calc1,"Native integer-division interpretation; projectile behavior not in-game verified");
        synergy("(skill('Immolation Arrow'.blvl)+skill('Magic Arrow'.blvl))*par8",[[27,8],[6,8]]);
        break;
      case 11:
        // calc1 includes stat('extra_cold_arrows'.accr), not available from manual +skills.
        synergy("(skill('Ice Arrow'.blvl))*par7 +(skill('Magic Arrow'.blvl)) * par8",[[21,7],[6,8]]);
        break;
      case 21:
        synergy("(skill('Cold Arrow'.blvl)+skill('Freezing Arrow'.blvl))*par8 + (skill('Magic Arrow'.blvl))*par6",[[11,8],[31,8],[6,6]]);
        break;
      case 16:
        if (row.calc1 === "par1+(blvl / 4)" && row.Param1 === "3") metric("Explosion radius (calc1 source units)",3+Math.trunc(hardPoints/4),row.calc1,"blvl means hard points; radius units and in-game parity unverified");
        if (row.calc2 === '"min((par2+(lvl/5)),8)"' && row.Param2 === "3") metric("Cluster bombs (calc2 preview)",Math.min(8,3+Math.trunc(level/5)),row.calc2,"Native integer-division interpretation; engine parity unverified");
        synergy("(skill('Immolation Arrow'.blvl)) * par8 + (skill('Magic Arrow'.blvl))*par7",[[27,8],[6,7]]);
        break;
      case 27:
        if (row.calc1 === "par1" && row.Param1 === "3") metric("Fire disc radius (calc1 source units)",3,row.calc1,"Native S14 parameter; engine units unverified");
        if (row.calc2 === "par2" && row.Param2 === "4") metric("Radial damage radius (calc2 source units)",4,row.calc2,"Native S14 parameter; engine units unverified");
        synergy("(skill('Exploding Arrow'.blvl)+skill('Fire Arrow'.blvl)+skill('Magic Arrow'.blvl))*par8",[[16,8],[7,8],[6,8]]);
        break;
      case 31:
        if (row.calc1 === "par1+(blvl / 4)" && row.Param1 === "4") metric("Damage radius (calc1 source units)",4+Math.trunc(hardPoints/4),row.calc1,"blvl means hard points; radius units and in-game parity unverified");
        synergy("(skill('Ice Arrow'.blvl))*par8 + skill('Cold Arrow'.blvl)*par6",[[21,8],[11,6]]);
        break;
    }
  }
  if (result.length && ![12,22,26].includes(skill.identity.internalId)) return result;
  // Passive & Magic: source-guarded independent previews; not engine-verified.
  if (skill.selected.skillPage === "2") {
    const passive = [];
    const add = (label,value,expression,assumption="Native S14 source-table preview; engine parity not verified") => passive.push({label,value,expression,assumption});
    const fixed = (field,expression) => row[field] === expression;
    switch(skill.identity.internalId) {
      case 8: // Inner Sight
        if (fixed("auralencalc","ln34") && row.Param3==="200" && row.Param4==="100") add("Aura duration (source units)",linear(row.Param3,row.Param4,level),row.auralencalc);
        if (fixed("aurarangecalc",'"min(ln56, 30)"') && row.Param5==="10" && row.Param6==="1") add("Aura range (source units)",Math.min(30,linear(row.Param5,row.Param6,level)),row.aurarangecalc);
        if (fixed("aurastatcalc2",'-"min(9+(lvl*par7),40)"') && row.Param7==="1") add("Enemy attack rating reduction % (magnitude)",Math.min(9+level,40),row.aurastatcalc2,"Native negative stat; shown as positive reduction magnitude, not enemy final AR");
        break;
      case 9: // Critical Strike
        if (fixed("passivecalc1","dm12") && fixed("passivestat1","passive_critical_strike") && row.Param1==="5" && row.Param2==="75") add("Critical Strike chance % (dm12 preview)",diminishingDm12(level,5,75),row.passivecalc1,"D2-family dm12 integer interpretation; engine parity not verified");
        break;
      case 13: // Dodge
        if (fixed("passivecalc1","dm12") && fixed("passivestat1","passive_dodge") && row.Param1==="0" && row.Param2==="40") add("Dodge chance % (dm12 preview)",diminishingDm12(level,0,40),row.passivecalc1);
        if (fixed("passivecalc3","4 + lvl") && fixed("passivestat3","item_fastergethitrate")) add("Faster hit recovery % (passivecalc3)",4+level,row.passivecalc3);
        break;
      case 17: // Slow Movement
        if (fixed("auralencalc","ln34") && row.Param3==="250" && row.Param4==="5") add("Aura duration (source units)",linear(row.Param3,row.Param4,level),row.auralencalc);
        if (fixed("aurarangecalc",'"min(ln56,24)"') && row.Param5==="18" && row.Param6==="1") add("Aura range (source units)",Math.min(24,linear(row.Param5,row.Param6,level)),row.aurarangecalc);
        if (fixed("aurastatcalc2",'-"min(ln78,65)"') && row.Param7==="20" && row.Param8==="2") add("Enemy velocity reduction % (magnitude)",Math.min(65,linear(row.Param7,row.Param8,level)),row.aurastatcalc2,"Native negative stat; shown as reduction magnitude, engine parity unverified");
        break;
      case 18: // Avoid: native passivecalc1 is constant zero; do not infer chance.
        if (fixed("passivecalc1","0") && fixed("passivestat1","passive_avoid")) add("Avoid passivecalc1 (source units)",0,row.passivecalc1,"Source explicitly says zero; not a verified avoidance chance");
        break;
      case 23: // Penetrate
        if (fixed("passivecalc1","ln12") && fixed("passivestat1","item_tohit_percent") && row.Param1==="35" && row.Param2==="10") add("Attack rating bonus % (passivecalc1)",linear(row.Param1,row.Param2,level),row.passivecalc1);
        if (fixed("passivecalc2","blvl/2") && fixed("passivestat2","passive_phys_pierce")) add("Physical pierce (source units)",Math.trunc(hardPoints/2),row.passivecalc2,"blvl means hard points; source units and in-game parity unverified");
        break;
      case 28: // Dopplezon
        if (fixed("aurastatcalc1",'"min(lvl*par3,85)"') && row.Param3==="5") add("Summon fire resistance % (source preview)",Math.min(level*5,85),row.aurastatcalc1);
        if (fixed("DmgSymPerCalc","(skill('Strafe'.blvl)+skill('Valkyrie'.blvl))*par8") && row.Param8==="10") add("Summon damage synergy bonus %",10*(Number(build[26]||0)+Number(build[32]||0)),row.DmgSymPerCalc,"Hard-point synergy; not total summon damage");
        break;
      case 29: // Evade
        if (fixed("passivecalc1",'"min(edmn, par2)"') && row.Param2==="40") add("Evade chance (unresolved)",null,row.passivecalc1,"edmn evaluator not established; no chance invented");
        break;
      case 32: // Valkyrie
        if (fixed("calc1","par1 * (lvl - 1) + skill('Dopplezon'.blvl) * par8") && row.Param1==="7" && row.Param8==="0") add("Summon bonus HP % (calc1)",7*(level-1),row.calc1,"Native formula; Dopplezon multiplier is zero in pinned S14");
        if (fixed("calc2","ln56") && row.Param5==="25" && row.Param6==="3") add("Summon item level (calc2)",linear(row.Param5,row.Param6,level),row.calc2);
        break;
      case 33: // Pierce
        if (fixed("passivecalc1","edmn") && fixed("passivestat1","skill_pierce")) add("Pierce chance (unresolved)",null,row.passivecalc1,"Native edmn evaluator unverified; no chance invented");
        break;
    }
    return passive;
  }
  if (skill.identity.internalId === 9 && row.passivecalc1 === "dm12" && row.passivestat1 === "passive_critical_strike") {
    return [{ label: "Critical Strike chance % (dm12 preview)", value: diminishingDm12(level, n(row.Param1), n(row.Param2)), expression: row.passivecalc1, assumption: "D2-family dm12 integer diminishing-return evaluator, capped at Param2; PD2 engine parity not verified" }];
  }
  if (skill.identity.internalId === 33 && row.passivecalc1 === "edmn" && row.passivestat1 === "skill_pierce") {
    return [{ label: "Pierce chance (unresolved)", value: null, expression: row.passivecalc1, assumption: "Native S14 token edmn is conventionally elemental minimum damage, not a generic chance function; Pierce engine usage unverified" }];
  }
  if (skill.identity.internalId === 6 && row.EDmgSymPerCalc === "(skill('Inner Sight'.blvl)+skill('Slow Movement'.blvl)+skill('Guided Arrow'.blvl))*par8" && Number(row.Param8) === 20) {
    const points = [8,17,22].map(id => Number(build[id] || 0));
    if (points.every(value => Number.isInteger(value) && value >= 0 && value <= 20)) {
      return [{ label: "Magic damage synergy bonus % (EDmgSymPerCalc)", value: points.reduce((a,b)=>a+b,0) * Number(row.Param8), expression: row.EDmgSymPerCalc, assumption: "20% per hard point in Inner Sight, Slow Movement and Guided Arrow; bonus is not total damage" }];
    }
  }
  // Fire and Cold Arrow: native S14 attack-rating bonus, not total attack rating or hit chance.
  if ([7,11].includes(skill.identity.internalId) && row.ToHit === "10" && row.LevToHit === "10") {
    return [{ label: "Attack rating bonus % (ToHit/LevToHit)", value: linear(row.ToHit, row.LevToHit, level), expression: "ToHit + (level − 1) × LevToHit", assumption: "Native S14 "+skill.identity.internalName+" ToHit=10, LevToHit=10; linear source-table preview, not yet verified against PD2 in-game tooltip; not final attack rating" }];
  }
  if (skill.identity.internalId === 12 && row.calc1 === '"min(25,ln12)"' && row.calc4 === "ln56") {
    return [
      { label: "Arrow count (calc1)", value: Math.min(25, linear(row.Param1, row.Param2, level)), expression: row.calc1, assumption: "ln12 = Param1 + (level − 1) × Param2" },
      { label: "Damage modifier % (calc4)", value: linear(row.Param5, row.Param6, level), expression: row.calc4, assumption: "ln56 = Param5 + (level − 1) × Param6; not total damage" },
      ...(row.ToHit === "8" && row.LevToHit === "6" ? [{ label: "Attack rating bonus % (ToHit/LevToHit)", value: linear(row.ToHit, row.LevToHit, level), expression: "ToHit + (level − 1) × LevToHit", assumption: "Native S14 ToHit=8, LevToHit=6; matches in-game +122% at level 20 and +128% at level 21; not final attack rating" }] : []),
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
