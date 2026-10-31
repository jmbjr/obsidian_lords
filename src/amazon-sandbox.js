import amazonSkills from "../pd2/generated/amazon-skills.json";
import { resolveAmazonLayout, validateAmazonLayout } from "./amazon-layout.js";

const skills = amazonSkills.skills;
validateAmazonLayout(skills);
const byId = new Map(skills.map((s) => [s.identity.internalId, s]));
const newBuild = () => Object.fromEntries(skills.map((s) => [s.identity.internalId, 0]));
const state = { level: 55, budget: 30, bonus: 0, active: 0, page: 1, selected: 12, builds: [newBuild(), newBuild()] };
const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const sum = (build) => Object.values(build).reduce((a, b) => a + b, 0);
const activeBuild = () => state.builds[state.active];
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
  const formulas = Object.entries(selected.raw.skill).filter(([key, value]) => value && /calc|sym|param|reqskill|aurastat/i.test(key) && !key.startsWith("*"));
  return `
    <section class="hero compact"><p class="eyebrow">PD2 Tools · Experimental</p><h1>Amazon Skill Sandbox</h1>
      <p class="lede">Plan and compare two skill allocations using native Season 14 skill-tree coordinates. Layout is source-based; icons and artwork are placeholders.</p>
      <div class="source-warning"><strong>Prototype: allocation first</strong><span>Points are manually budgeted. Level gates and prerequisites are flagged, not enforced. Raw formulas are displayed but not evaluated into damage numbers. No automatic quest-point or respec assumptions.</span></div>
    </section>
    <section class="section wide">
      <div class="sandbox-settings">
        <label>Character level <input data-setting="level" type="number" min="1" max="99" value="${state.level}"></label>
        <label>Points to allocate <input data-setting="budget" type="number" min="0" max="150" value="${state.budget}"></label>
        <label>+All skills <input data-setting="bonus" type="number" min="0" max="40" value="${state.bonus}"></label>
      </div>
      <div class="sandbox-summary">
        <strong>Build ${state.active === 0 ? "A" : "B"} · ${sum(current)} spent / ${state.budget} available · ${pointsLeft()} remaining</strong>
        <div class="sandbox-actions"><button data-build="0" aria-pressed="${state.active === 0}">Build A</button><button data-build="1" aria-pressed="${state.active === 1}">Build B</button><button data-reset="true">Clear current build</button></div>
      </div>
      <div class="sandbox-actions"><button data-page="1" aria-pressed="${state.page === 1}">Bow & Crossbow</button><button data-page="2" aria-pressed="${state.page === 2}">Passive & Magic</button><button data-page="3" aria-pressed="${state.page === 3}">Javelin & Spear</button></div>
      <div class="skill-tree" aria-label="Amazon skill tree">
        ${cards.map((skill) => {
          const id = skill.identity.internalId;
          const points = current[id];
          const locked = state.level < skill.selected.requiredLevel;
          return `<div class="tree-node ${state.selected === id ? "chosen" : ""}" style="grid-row:${resolveAmazonLayout(skill).row};grid-column:${resolveAmazonLayout(skill).column}">
            <button class="tree-skill" data-select="${id}" aria-pressed="${state.selected === id}"><span class="tree-glyph">✦</span><span>${escape(skill.identity.internalName)}</span></button>
            <div class="tree-points"><button data-adjust="${id}" data-delta="-1" aria-label="Remove ${escape(skill.identity.internalName)} point" ${points === 0 ? "disabled" : ""}>−</button><strong>${points}<small> + ${state.bonus}</small></strong><button data-adjust="${id}" data-delta="1" aria-label="Add ${escape(skill.identity.internalName)} point" ${points >= skill.selected.maxLevel || pointsLeft() <= 0 ? "disabled" : ""}>+</button></div>
            ${locked ? '<small class="tree-warning">Level gated</small>' : ""}${resolveAmazonLayout(skill).status === "provisional" ? '<small class="tree-warning">Provisional position</small>' : ""}
          </div>`;
        }).join("")}
      </div>
      ${unplaced.length ? `<p class="annotation">Unverified tree position (select to allocate in inspector): ${unplaced.map((s) => escape(s.identity.internalName)).join(", ")}. These skills can still be allocated below.</p><div class="sandbox-actions">${unplaced.map((s) => `<button data-select="${s.identity.internalId}">${escape(s.identity.internalName)}</button>`).join("")}</div>` : ""}
      <section class="sandbox-inspector">
        <h2>${escape(selected.identity.internalName)}</h2>
        <p class="annotation">Required level ${selected.selected.requiredLevel} · hard points ${current[state.selected]} · displayed skill level ${current[state.selected] ? current[state.selected] + state.bonus : 0} (simple +skills assumption)</p>
        <div class="tree-points"><button data-adjust="${state.selected}" data-delta="-1" ${current[state.selected] === 0 ? "disabled" : ""}>−</button><strong>${current[state.selected]} / ${selected.selected.maxLevel}</strong><button data-adjust="${state.selected}" data-delta="1" ${current[state.selected] >= selected.selected.maxLevel || pointsLeft() <= 0 ? "disabled" : ""}>+</button></div>
        <p class="annotation">Native S14 fields. Equations are source expressions, not interpreted results; dependencies may refer to other skills or engine variables.</p>
        <div class="raw-table">${formulas.map(([key, value]) => `<div class="raw-row"><div><code>${escape(key)}</code></div><code class="raw-value">${escape(value)}</code></div>`).join("")}</div>
      </section>
      <section class="sandbox-inspector"><h2>Compare builds</h2>
        <p class="annotation">Build A: ${sum(state.builds[0])} points · Build B: ${sum(state.builds[1])} points. Both share the same level, budget and +skills settings.</p>
        <div class="sandbox-compare"><div><strong>Skill</strong><strong>A</strong><strong>B</strong></div>
        ${skills.filter((skill) => state.builds.some((b) => b[skill.identity.internalId] > 0)).map((skill) => `<div><span>${escape(skill.identity.internalName)}</span><span>${state.builds[0][skill.identity.internalId]}</span><span>${state.builds[1][skill.identity.internalId]}</span></div>`).join("") || "<p>No points allocated yet.</p>"}</div>
      </section>
      <p class="annotation">Source: ${escape(amazonSkills.source.repository)} @ ${escape(amazonSkills.source.commit.slice(0, 12))}. This prototype intentionally does not calculate DPS or enforce skill-tree prerequisites.</p>
    </section>`;
}

export function mountAmazonSandbox(container) {
  if (!container) return;
  const redraw = () => { container.innerHTML = renderAmazonSandbox(); };
  redraw();
  container.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !container.contains(button)) return;
    if (button.dataset.build !== undefined) state.active = Number(button.dataset.build);
    if (button.dataset.page !== undefined) state.page = Number(button.dataset.page);
    if (button.dataset.select !== undefined) state.selected = Number(button.dataset.select);
    if (button.dataset.reset) state.builds[state.active] = newBuild();
    if (button.dataset.adjust !== undefined) {
      const id = Number(button.dataset.adjust);
      const delta = Number(button.dataset.delta);
      const skill = byId.get(id);
      const current = activeBuild()[id];
      if (skill && ((delta === 1 && current < skill.selected.maxLevel && pointsLeft() > 0) || (delta === -1 && current > 0))) activeBuild()[id] += delta;
    }
    redraw();
  });
  container.addEventListener("change", (event) => {
    const field = event.target.closest("[data-setting]");
    if (!field) return;
    const key = field.dataset.setting;
    if (key === "level") state.level = inputNumber(field.value, state.level, 1, 99);
    if (key === "budget") state.budget = Math.max(sum(state.builds[0]), sum(state.builds[1]), inputNumber(field.value, state.budget, 0, 150));
    if (key === "bonus") state.bonus = inputNumber(field.value, state.bonus, 0, 40);
    redraw();
  });
}
