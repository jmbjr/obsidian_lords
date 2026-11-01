import amazonSkills from "../pd2/generated/amazon-skills.json";
import { resolveAmazonLayout, validateAmazonLayout } from "./amazon-layout.js";
import { previewAmazonSkill } from "./amazon-formulas.js";
import { STORAGE_KEY, normalizeBuildSnapshot, compareAmazonBuilds, findAmazonDependencies, emptyBonus, bonusForSkill, normalizeComparisonConfig, normalizeFullComparison, amazonAllocationIssues, amazonBuildIssues } from "./amazon-comparison.js";

const skills = amazonSkills.skills;
validateAmazonLayout(skills);
const byId = new Map(skills.map((s) => [s.identity.internalId, s]));
const newBuild = () => Object.fromEntries(skills.map((s) => [s.identity.internalId, 0]));
const state = { level: 55, budget: 30, bonuses: [emptyBonus(), emptyBonus()], active: 0, page: 1, selected: 12, builds: [newBuild(), newBuild()], comparison: { skillIds: [12] } };
const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const formatSummaryLevel = (skill, buildIndex) => {
  const hard = state.builds[buildIndex][skill.identity.internalId] || 0;
  const effective = hard > 0 ? hard + bonusForSkill(skill, state.bonuses[buildIndex]) : 0;
  return `<span class="summary-effective-level">${effective}</span> <span class="summary-hard-level">(${hard})</span>`;
};
const sum = (build) => Object.values(build).reduce((a, b) => a + b, 0);
const activeBuild = () => state.builds[state.active];
const activeBonus = () => state.bonuses[state.active];
const effectiveBonus = skill => bonusForSkill(skill, activeBonus());
const pointsLeft = () => state.budget - sum(activeBuild());
const inputNumber = (value, fallback, min, max) => {
  if (String(value).trim() === "") return fallback;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.trunc(number))) : fallback;
};

export function renderAmazonSandbox() {
  const selected = byId.get(state.selected);
  const current = activeBuild();
  const cards = skills.filter((skill) => resolveAmazonLayout(skill).page === state.page);
  const unplaced = skills.filter((skill) => resolveAmazonLayout(skill).page === null);
  const preview = previewAmazonSkill(selected, current[state.selected], effectiveBonus(selected), current);
  const comparisons = compareAmazonBuilds(skills, state.builds, state.bonuses, state.comparison);
  const dependencies = findAmazonDependencies(selected, skills);
  const buildIssues = state.builds.map(build => amazonBuildIssues(build,state.level,skills));
  const formulas = Object.entries(selected.raw.skill).filter(([key, value]) => value && /calc|sym|param|reqskill|aurastat/i.test(key) && !key.startsWith("*"));
  return `
    <section class="hero compact"><p class="eyebrow">PD2 Tools · Experimental</p><h1>Amazon Skill Sandbox</h1>
      <p class="lede">Plan and compare two skill allocations using native Season 14 skill-tree coordinates. Layout is source-based; icons and artwork are placeholders.</p>
      <div class="source-warning"><strong>Prototype: allocation first</strong><span>Hard points are manually budgeted (max 20 per skill); bonus skill levels can raise effective levels to 60 and beyond. New allocations respect level gates and supported prerequisites; imported or previously allocated invalid builds are flagged without data loss. Raw formulas are displayed but not evaluated into damage numbers. No automatic quest-point or respec assumptions.</span></div>
    </section>
    <section class="section wide">
      <div class="sandbox-settings">
        <label>Character level <input data-setting="level" type="number" min="1" max="99" value="${state.level}"></label>
        <label>Points to allocate <input data-setting="budget" type="number" min="0" max="150" value="${state.budget}"></label>
        <label>Build A · +All Skills <input data-bonus-build="0" type="number" min="0" max="100" value="${state.bonuses[0].all}"></label><label>Build B · +All Skills <input data-bonus-build="1" type="number" min="0" max="100" value="${state.bonuses[1].all}"></label>
      </div>
      <div class="sandbox-settings">
        ${[0,1].map(index => `<fieldset><legend>Build ${index === 0 ? "A" : "B"} · +Tree Skills</legend>${[[1,"Bow & Crossbow"],[2,"Passive & Magic"],[3,"Javelin & Spear"]].map(([page,name]) => `<label>${name} <input type="number" min="0" max="100" data-tree-bonus="${page}" data-bonus-build="${index}" value="${state.bonuses[index].trees[page]}"></label>`).join("")}</fieldset>`).join("")}
      </div>
      <div class="sandbox-summary">
        <strong>Build ${state.active === 0 ? "A" : "B"} · ${sum(current)} spent / ${state.budget} available · ${pointsLeft()} remaining</strong>
        ${buildIssues.map((issues,index) => issues.length ? `<p class="tree-warning">Build ${index ? "B" : "A"}: ${issues.length} allocation warning(s). ${escape(issues.slice(0,3).map(x=>x.skill+": "+x.message).join("; "))}${issues.length>3 ? "…" : ""}</p>` : "").join("")}
        <div class="sandbox-actions"><button data-copy="true">Copy build JSON</button><button data-import="true">Import build JSON</button><button data-build="0" aria-pressed="${state.active === 0}">Build A</button><button data-build="1" aria-pressed="${state.active === 1}">Build B</button><button data-reset="true">Clear current build</button></div>
      </div>
      <div class="sandbox-actions"><button data-page="1" aria-pressed="${state.page === 1}">Bow & Crossbow</button><button data-page="2" aria-pressed="${state.page === 2}">Passive & Magic</button><button data-page="3" aria-pressed="${state.page === 3}">Javelin & Spear</button></div>
      <div class="skill-tree" aria-label="Amazon skill tree">
        ${cards.map((skill) => {
          const id = skill.identity.internalId;
          const points = current[id];
          const reasons = amazonAllocationIssues(skill,current,state.level,skills);
          const locked = reasons.length > 0;
          return `<div class="tree-node ${state.selected === id ? "chosen" : ""}" style="grid-row:${resolveAmazonLayout(skill).row};grid-column:${resolveAmazonLayout(skill).column}">
            <button class="tree-skill" data-select="${id}" aria-pressed="${state.selected === id}"><span class="tree-glyph">✦</span><span>${escape(skill.identity.internalName)}</span></button>
            <div class="tree-points"><span class="hard-point-controls"><button data-adjust="${id}" data-delta="1" aria-label="Add ${escape(skill.identity.internalName)} hard point" ${points >= skill.selected.maxLevel || pointsLeft() <= 0 || locked ? "disabled" : ""}>▲</button><button data-adjust="${id}" data-delta="-1" aria-label="Remove ${escape(skill.identity.internalName)} hard point" ${points === 0 ? "disabled" : ""}>▼</button></span><strong>${points}<small> + ${effectiveBonus(skill)}</small></strong><span class="skill-bonus-controls" title="Individual skill bonus levels (blue arrows)"><button class="skill-bonus-button" data-bonus-adjust="${id}" data-delta="-1" aria-label="Remove bonus level from ${escape(skill.identity.internalName)}" ${(activeBonus().skills[id] || 0) <= 0 ? "disabled" : ""}>▼</button><button class="skill-bonus-button" data-bonus-adjust="${id}" data-delta="1" aria-label="Add bonus level to ${escape(skill.identity.internalName)}" ${(activeBonus().skills[id] || 0) >= 100 ? "disabled" : ""}>▲</button></span></div>
            ${locked ? `<small class="tree-warning">${escape(reasons.join("; "))}</small>` : ""}${resolveAmazonLayout(skill).status === "provisional" ? '<small class="tree-warning">Provisional position</small>' : ""}
          </div>`;
        }).join("")}
      </div>
      ${unplaced.length ? `<p class="annotation">Unverified tree position (select to allocate in inspector): ${unplaced.map((s) => escape(s.identity.internalName)).join(", ")}. These records remain explorable here, but may not be player-selectable in-game.</p><div class="sandbox-actions">${unplaced.map((s) => `<button data-select="${s.identity.internalId}">${escape(s.identity.internalName)}</button>`).join("")}</div>` : ""}
      <section class="sandbox-inspector">
        <h2>${escape(selected.identity.internalName)}</h2>
        ${state.selected === 365 ? `<p class="annotation"><strong>Vestigial / removed skill:</strong> Shattering Arrow was developed before PD2 Season 1 and removed before release, according to a July 28, 2023 developer Discord response shared by a player. Its definitions remain in the Season 14 data; it is retained here for historical experimentation, not as a normally selectable skill.</p>` : ""}
        <p class="annotation">Required level ${selected.selected.requiredLevel} · hard points ${current[state.selected]} · effective skill level ${current[state.selected] ? current[state.selected] + effectiveBonus(selected) : 0} (+all, +tree and +skill bonuses; hard points remain capped at 20)</p>
        <p class="annotation">Individual bonus levels for this skill: +${activeBonus().skills[state.selected] || 0}. Use the blue + / − controls beside its tree node to adjust.</p>
        <div class="tree-points"><button data-adjust="${state.selected}" data-delta="-1" ${current[state.selected] === 0 ? "disabled" : ""}>−</button><strong>${current[state.selected]} / ${selected.selected.maxLevel}</strong><button data-adjust="${state.selected}" data-delta="1" ${current[state.selected] >= selected.selected.maxLevel || pointsLeft() <= 0 || amazonAllocationIssues(selected,current,state.level,skills).length ? "disabled" : ""}>+</button></div>
        <p class="annotation">Formula references to other skills: ${dependencies.length ? dependencies.map(escape).join(", ") : "none detected"}. Only explicitly supported, source-guarded references are evaluated as synergies.</p>
        <p class="annotation">Native S14 fields. The limited numeric previews below use explicit linear-parameter assumptions, not verified engine output or DPS. Other expressions remain uninterpreted.</p>
        ${preview.length ? `<div class="sandbox-preview">${preview.map((item) => `<div><strong>${escape(item.label)}: ${escape(item.value === null ? "Not calculated" : item.value)}</strong><small>${escape(item.expression)} · ${escape(item.assumption)}</small></div>`).join("")}</div>` : `<p class="annotation">No supported numeric preview for this skill yet.</p>`}
        <div class="raw-table">${formulas.map(([key, value]) => `<div class="raw-row"><div><code>${escape(key)}</code></div><code class="raw-value">${escape(value)}</code></div>`).join("")}</div>
      </section>
      <section class="sandbox-inspector"><h2>Comparison configuration</h2>
        <p class="annotation">Choose skills to include. Available numeric metrics are shown for selected skills; unsupported formulas are not invented.</p>
        <div class="comparison-skill-picker">${skills.map(skill => `<label><input type="checkbox" data-compare-skill="${skill.identity.internalId}" ${state.comparison.skillIds.includes(skill.identity.internalId) ? "checked" : ""}> ${escape(skill.identity.internalName)}</label>`).join("")}</div>
        <div class="sandbox-actions"><button data-copy-config="true">Copy comparison config JSON</button><button data-import-config="true">Load comparison config JSON</button><button data-export-full="true">Export full comparison JSON file</button><button data-import-full="true">Import full comparison JSON file</button><input data-full-file type="file" accept=".json,application/json" hidden></div>
      </section>
      <section class="sandbox-inspector"><h2>Calculated build comparison</h2>
        <p class="annotation">B − A shows the change between builds. A dash means that build has no allocated hard points for that skill. Results are limited formula previews, not DPS.</p>
        <div class="sandbox-compare sandbox-metrics"><div><strong>Skill · metric</strong><strong>A</strong><strong>B</strong><strong>Δ B−A</strong></div>
        ${comparisons.map(item => `<div><span>${escape(item.skill)} · ${escape(item.label)}<small>${escape(item.assumption)}</small></span><span>${item.a ?? "—"}</span><span>${item.b ?? "—"}</span><span>${item.delta === null ? "—" : item.delta > 0 ? "+" + item.delta : item.delta}</span></div>`).join("") || "<p>Select skills above and allocate points to see supported numeric comparisons.</p>"}</div>
      </section>
      <section class="sandbox-inspector"><h2>Compare builds</h2>
        <p class="annotation">Build A: ${sum(state.builds[0])} points · Build B: ${sum(state.builds[1])} points. Both share the same character level and point budget; +All Skills bonuses are independent (A: +${state.bonuses[0].all}, B: +${state.bonuses[1].all}; tree and skill bonuses are also independent).</p>
        <div class="sandbox-compare"><div><strong>Skill</strong><strong>A</strong><strong>B</strong></div>
        ${skills.filter((skill) => state.builds.some((b) => b[skill.identity.internalId] > 0)).map((skill) => `<div><span>${escape(skill.identity.internalName)}</span><span>${formatSummaryLevel(skill,0)}</span><span>${formatSummaryLevel(skill,1)}</span></div>`).join("") || "<p>No points allocated yet.</p>"}</div>
      </section>
      <p class="annotation">Source: ${escape(amazonSkills.source.repository)} @ ${escape(amazonSkills.source.commit.slice(0, 12))}. This prototype does not calculate DPS. Native prerequisite cycles/unresolved references are flagged for investigation.</p>
    </section>`;
}

export function mountAmazonSandbox(container) {
  if (!container) return;
  try { const saved = normalizeBuildSnapshot(JSON.parse(localStorage.getItem(STORAGE_KEY)), skills); if (saved) { Object.assign(state, saved); state.comparison = normalizeComparisonConfig(JSON.parse(localStorage.getItem(STORAGE_KEY))?.comparison,skills) || state.comparison; } } catch { /* private browsing or invalid stored data */ }
  const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1,level:state.level,budget:state.budget,bonuses:state.bonuses,builds:state.builds,comparison:state.comparison})); } catch { /* storage unavailable */ } };
  const redraw = () => { container.innerHTML = renderAmazonSandbox(); };
  const fullSnapshot = () => ({format:"obsidian-lords-amazon-comparison",version:1,level:state.level,budget:state.budget,builds:state.builds,bonuses:state.bonuses,comparison:state.comparison});
  const copyJson = value => { const text = JSON.stringify(value,null,2); if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => window.prompt("Copy JSON:",text)); else window.prompt("Copy JSON:",text); };
  redraw();
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !container.contains(button)) return;
    if (button.dataset.copyConfig) { copyJson(state.comparison); return; }
    if (button.dataset.importConfig) {
      const raw = window.prompt("Paste comparison config JSON:");
      if (raw === null) return;
      try { const config = normalizeComparisonConfig(JSON.parse(raw),skills); if (!config) throw Error("Invalid config"); state.comparison = config; persist(); redraw(); }
      catch { window.alert("Invalid comparison config. No changes were made."); }
      return;
    }
    if (button.dataset.exportFull) {
      const blob = new Blob([JSON.stringify(fullSnapshot(),null,2)],{type:"application/json"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a"); link.href=url; link.download="amazon-comparison.json"; link.click(); URL.revokeObjectURL(url);
      return;
    }
    if (button.dataset.importFull) { container.querySelector("[data-full-file]")?.click(); return; }
    if (button.dataset.copy) {
      const snapshot = JSON.stringify({version:1,level:state.level,budget:state.budget,bonuses:state.bonuses,builds:state.builds,comparison:state.comparison},null,2);
      if (navigator.clipboard?.writeText) navigator.clipboard.writeText(snapshot).catch(() => window.prompt("Copy build JSON:",snapshot));
      else window.prompt("Copy build JSON:",snapshot);
      return;
    }
    if (button.dataset.import) {
      const text = window.prompt("Paste exported build JSON:");
      if (text === null) return;
      try { const saved = normalizeBuildSnapshot(JSON.parse(text), skills); if (!saved) throw new Error("Invalid build format"); Object.assign(state,saved); state.comparison = normalizeComparisonConfig(JSON.parse(text).comparison,skills) || state.comparison; persist(); redraw(); }
      catch { window.alert("Invalid build JSON. No changes were made."); }
      return;
    }
    if (button.dataset.build !== undefined) state.active = Number(button.dataset.build);
    if (button.dataset.page !== undefined) state.page = Number(button.dataset.page);
    if (button.dataset.select !== undefined) state.selected = Number(button.dataset.select);
    if (button.dataset.reset) state.builds[state.active] = newBuild();
    if (button.dataset.bonusAdjust !== undefined) {
      const id = Number(button.dataset.bonusAdjust);
      const delta = Number(button.dataset.delta);
      if (byId.has(id) && (delta === 1 || delta === -1)) activeBonus().skills[id] = Math.max(0, Math.min(100, (activeBonus().skills[id] || 0) + delta));
    }
    if (button.dataset.adjust !== undefined) {
      const id = Number(button.dataset.adjust);
      const delta = Number(button.dataset.delta);
      const skill = byId.get(id);
      const current = activeBuild()[id];
      if (skill && ((delta === 1 && current < skill.selected.maxLevel && pointsLeft() > 0 && amazonAllocationIssues(skill,activeBuild(),state.level,skills).length === 0) || (delta === -1 && current > 0))) activeBuild()[id] += delta;
    }
    persist();
    redraw();
  });
  container.addEventListener("change", async (event) => {
    if (event.target.matches("[data-full-file]")) {
      const file = event.target.files?.[0]; if (!file) return;
      try { const parsed = normalizeFullComparison(JSON.parse(await file.text()),skills); if (!parsed) throw Error("Invalid full comparison"); Object.assign(state,parsed); persist(); redraw(); }
      catch { window.alert("Invalid full comparison file. No changes were made."); }
      return;
    }
    if (event.target.matches("[data-compare-skill]")) {
      const id = Number(event.target.dataset.compareSkill);
      const ids = new Set(state.comparison.skillIds);
      if (event.target.checked) ids.add(id); else ids.delete(id);
      state.comparison = normalizeComparisonConfig({skillIds:[...ids]},skills) || state.comparison;
      persist(); redraw(); return;
    }
    const field = event.target.closest("[data-setting]");
    const bonusField = event.target.closest("[data-bonus-build]");
    if (bonusField) {
      const index = Number(bonusField.dataset.bonusBuild);
      if (index !== 0 && index !== 1) return;
      const bonus = state.bonuses[index];
      if (bonusField.dataset.treeBonus) {
        const page = Number(bonusField.dataset.treeBonus);
        if (![1,2,3].includes(page)) return;
        bonus.trees[page] = inputNumber(bonusField.value,bonus.trees[page],0,100);
      } else bonus.all = inputNumber(bonusField.value,bonus.all,0,100);
      persist(); redraw(); return;
    }
    const skillField = event.target.closest("[data-skill-bonus]");
    if (skillField) {
      const id = Number(skillField.dataset.skillBonus);
      if (!byId.has(id)) return;
      activeBonus().skills[id] = inputNumber(skillField.value,activeBonus().skills[id] || 0,0,100);
      persist(); redraw(); return;
    }
    if (!field) return;
    const key = field.dataset.setting;
    if (key === "level") state.level = inputNumber(field.value, state.level, 1, 99);
    if (key === "budget") state.budget = Math.max(sum(state.builds[0]), sum(state.builds[1]), inputNumber(field.value, state.budget, 0, 150));
    
    persist();
    redraw();
  });
}
