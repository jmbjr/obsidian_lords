// M4: source-derived skill bonuses + an independent manual scratch layer.
// Recomputing is idempotent: never feed an already aggregated gear bonus back
// into the resolver when weapon set or item eligibility changes.
import { emptyBonus, normalizeBonus } from "./amazon-comparison.js";
import { resolveAmazonEquipmentSkills } from "./amazon-equipment-skills.js";

export const defaultEquipmentSettings = () => ({
  weaponSet: "main", includeEquipment: true, excludedItemIds: [],
});

export function combineSkillBonuses(manual, equipment, skills) {
  const a=normalizeBonus(manual,skills), b=normalizeBonus(equipment,skills);
  const add=(x,y)=>Math.min(100,x+y);
  const result=emptyBonus();
  result.all=add(a.all,b.all);
  for (const page of [1,2,3]) result.trees[page]=add(a.trees[page],b.trees[page]);
  for (const key of new Set([...Object.keys(a.skills),...Object.keys(b.skills)])) {
    const value=add(a.skills[key]||0,b.skills[key]||0);
    if (value) result.skills[key]=value;
  }
  return result;
}

export function resolveEquipmentBuild(payload,skills,manual=emptyBonus(),settings=defaultEquipmentSettings()) {
  const resolved=resolveAmazonEquipmentSkills(payload,skills,settings);
  return {
    bonus: combineSkillBonuses(manual,resolved.bonus,skills),
    equipmentBonus: resolved.bonus,
    manualBonus: normalizeBonus(manual,skills),
    selection: resolved.selection,
    sources: resolved.sources,
    unresolved: resolved.unresolved,
  };
}
