import { previewAmazonSkill } from "./amazon-formulas.js";
import { bonusForSkill } from "./amazon-comparison.js";

// Resolve Amazon Critical Strike from the same source-guarded passive preview
// used in the skill inspector and A/B comparison. Do not activate an
// unlearned passive from +All or +Tree skills alone. Direct +skill can grant it.
export function amazonCriticalStrikeChance(skill, build, bonuses) {
  if (!skill || skill.identity?.internalId !== 9) return null;
  const hard = Number(build?.[9] || 0);
  const direct = Number(bonuses?.skills?.[9] || 0);
  if (!Number.isInteger(hard) || hard < 0 || hard > 20 ||
      !Number.isInteger(direct) || direct < 0) return null;
  if (hard === 0 && direct === 0) return 0;
  const bonus = bonusForSkill(skill, bonuses);
  const preview = previewAmazonSkill(skill, hard, bonus, build, direct > 0);
  const chance = preview.find(metric =>
    metric.label === "Critical Strike chance % (dm12 preview)" &&
    metric.expression === "dm12"
  )?.value;
  return typeof chance === "number" && Number.isFinite(chance) && chance >= 0 && chance <= 100
    ? chance : null;
}
