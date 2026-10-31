import { previewAmazonSkill } from "./amazon-formulas.js";

// Bonus aggregates are independent of whether their source is manual input or equipment.
export const emptyBonus = () => ({ all: 0, trees: { 1: 0, 2: 0, 3: 0 }, skills: {} });
export function normalizeBonus(input, skills) {
  const safe = value => Number.isInteger(value) && value >= 0 && value <= 100 ? value : 0;
  if (typeof input === "number") return { ...emptyBonus(), all: safe(input) };
  if (!input || typeof input !== "object" || Array.isArray(input)) return emptyBonus();
  const valid = new Set(skills.map(s => String(s.identity.internalId)));
  const specific = Object.fromEntries(Object.entries(input.skills || {}).filter(([id]) => valid.has(id)).map(([id, value]) => [id, safe(value)]));
  return { all: safe(input.all), trees: Object.fromEntries([1,2,3].map(page => [page, safe(input.trees?.[page])])), skills: specific };
}
export function bonusForSkill(skill, bonus) {
  if (typeof bonus === "number") return bonus;
  const page = skill.selected.skillPage;
  return (bonus?.all || 0) + (bonus?.trees?.[page] || 0) + (bonus?.skills?.[skill.identity.internalId] || 0);
}
export const STORAGE_KEY = "obsidian-lords-amazon-builds-v1";
export function normalizeBuildSnapshot(input, skills) {
  if (!input || typeof input !== "object" || input.version !== 1 || !Array.isArray(input.builds) || input.builds.length !== 2) return null;
  const allowed = new Map(skills.map(s => [String(s.identity.internalId), s.selected.maxLevel]));
  const builds = input.builds.map(build => {
    if (!build || typeof build !== "object" || Array.isArray(build)) return null;
    return Object.fromEntries([...allowed].map(([id, max]) => {
      const value = build[id];
      return [id, Number.isInteger(value) && value >= 0 && value <= max ? value : 0];
    }));
  });
  if (builds.some(b => !b)) return null;
  const bounded = (v, lo, hi, fallback) => Number.isInteger(v) && v >= lo && v <= hi ? v : fallback;
  const spent = Math.max(...builds.map(b => Object.values(b).reduce((a,c)=>a+c,0)));
  return { version: 1, level: bounded(input.level,1,99,55), budget: Math.max(spent,bounded(input.budget,0,150,30)), bonuses: Array.isArray(input.bonuses) && input.bonuses.length === 2 ? input.bonuses.map(v => normalizeBonus(v,skills)) : [normalizeBonus(bounded(input.bonus,0,100,0),skills), normalizeBonus(bounded(input.bonus,0,100,0),skills)], builds };
}
export function compareAmazonBuilds(skills, builds, bonuses) {
  return skills.flatMap(skill => {
    const id = skill.identity.internalId;
    const a = previewAmazonSkill(skill, builds[0][id] || 0, bonusForSkill(skill,bonuses[0]), builds[0]);
    const b = previewAmazonSkill(skill, builds[1][id] || 0, bonusForSkill(skill,bonuses[1]), builds[1]);
    const labels = [...new Set([...a,...b].map(v=>v.label))];
    return labels.map(label => {
      const av = a.find(v=>v.label===label);
      const bv = b.find(v=>v.label===label);
      return { id, skill: skill.identity.internalName, label, a: av?.value ?? null, b: bv?.value ?? null, delta: typeof av?.value === "number" && typeof bv?.value === "number" ? bv.value - av.value : null, assumption: av?.assumption ?? bv?.assumption };
    });
  });
}
export function findAmazonDependencies(skill, skills) {
  const expr = Object.entries(skill.raw.skill).filter(([key,value]) => /calc|sym/i.test(key) && typeof value === "string").map(([,value])=>value).join(" ");
  return skills.filter(other => other.identity.internalId !== skill.identity.internalId && (expr.includes("skill('"+other.identity.internalName+"'") || expr.includes("skill(\""+other.identity.internalName+"\""))).map(s=>s.identity.internalName);
}
