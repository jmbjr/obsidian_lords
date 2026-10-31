import { previewAmazonSkill } from "./amazon-formulas.js";

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
  return { version: 1, level: bounded(input.level,1,99,55), budget: Math.max(spent,bounded(input.budget,0,150,30)), bonus: bounded(input.bonus,0,100,0), builds };
}
export function compareAmazonBuilds(skills, builds, bonus) {
  return skills.flatMap(skill => {
    const id = skill.identity.internalId;
    const a = previewAmazonSkill(skill, builds[0][id] || 0, bonus, builds[0]);
    const b = previewAmazonSkill(skill, builds[1][id] || 0, bonus, builds[1]);
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
