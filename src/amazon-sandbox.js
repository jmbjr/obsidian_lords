import amazonSkills from "../pd2/generated/amazon-skills.json";
import { resolveAmazonLayout, validateAmazonLayout } from "./amazon-layout.js";
import { previewAmazonSkill } from "./amazon-formulas.js";
import { multishotProcScenario } from "./multishot-procs.js";
import { multipleShotTargetScenario } from "./multishot-combat.js";
import { multipleShotBasicAttack } from "./multishot-basic-attack.js";
import { amazonCriticalStrikeChance } from "./amazon-critical-strike.js";
import { armoryCharacterUrl, importArmoryAmazon } from "./pd2-armory.js";
import { compareMarginalEffects } from "./multishot-marginal.js";
import { STORAGE_KEY, normalizeBuildSnapshot, compareAmazonBuilds, findAmazonDependencies, emptyBonus, bonusForSkill, normalizeComparisonConfig, normalizeFullComparison, amazonAllocationIssues, amazonBuildIssues } from "./amazon-comparison.js";

const skills = amazonSkills.skills;
validateAmazonLayout(skills);
const byId = new Map(skills.map((s) => [s.identity.internalId, s]));
const newBuild = () => Object.fromEntries(skills.map((s) => [s.identity.internalId, 0]));
const procScenario = { hits: 5, chance: 20 };
const combatScenario = { hits: 1, physical: 100, crit: 0, deadly: 0, crushing: 20, wounds: 20, woundDamage: 0, life: 10000 };
const critScenario = { useBuild: true };
const armoryImports = [null,null];
let armoryMessage = "";
let armoryName = "Magizon";
let armoryDraft = "";
const basicScenario = { weaponMin: 100, weaponMax: 100, otherED: 0, baseAR: 1000, otherAR: 0, defense: 1000, monsterLevel: 55, targetBlock: 0, useDamage: false };
const state = { level: 55, budget: 30, bonuses: [emptyBonus(), emptyBonus()], active: 0, page: 1, selected: 12, builds: [newBuild(), newBuild()], comparison: { skillIds: [12] } };
const escape = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const formatSummaryLevel = (skill, buildIndex) => {
  const hard = state.builds[buildIndex][skill.identity.internalId] || 0;
  const effective = hard > 0 || (state.bonuses[buildIndex].skills[skill.identity.internalId] || 0) > 0 ? hard + bonusForSkill(skill, state.bonuses[buildIndex]) : 0;
  return `<span class="summary-effective-level">${effective}</span> <span class="summary-hard-level">(${hard})</span>`;
};
const sum = (build) => Object.values(build).reduce((a, b) => a + b, 0);
const activeBuild = () => state.builds[state.active];
const activeBonus = () => state.bonuses[state.active];
const effectiveBonus = skill => bonusForSkill(skill, activeBonus());
const skillLevelBreakdown = (skill, hard) => {
  const bonus = activeBonus();
  const individual = bonus.skills[skill.identity.internalId] || 0;
  const tree = bonus.trees[skill.selected.skillPage] || 0;
  const all = bonus.all || 0;
  const total = hard > 0 || individual > 0 ? hard + individual + tree + all : 0;
  return `<span class="skill-level-breakdown"><span class="skill-level-total">${total}</span><span class="skill-level-components">(<span class="skill-level-hard">${hard}</span> + <span class="skill-level-individual">${individual}</span> + <span class="skill-level-tree">${tree}</span> + <span class="skill-level-all">${all}</span>)</span></span>`;
};
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
  const preview = previewAmazonSkill(selected, current[state.selected], effectiveBonus(selected), current, (activeBonus().skills[selected.identity.internalId] || 0) > 0);
  const comparisons = compareAmazonBuilds(skills, state.builds, state.bonuses, state.comparison);
  const dependencies = findAmazonDependencies(selected, skills);
  const buildIssues = state.builds.map(build => amazonBuildIssues(build,state.level,skills));
  const multi = byId.get(12);
  const multiHard = current[12] || 0;
  const multiBonus = activeBonus().skills[12] || 0;
  const multiLevel = multiHard || multiBonus ? multiHard + bonusForSkill(multi, activeBonus()) : 0;
  const multiArrows = multiLevel ? Math.min(25, multiLevel + 4) : 0;
  const scenarioHits = Math.min(procScenario.hits, multiArrows);
  const procOutcome = multishotProcScenario(scenarioHits, procScenario.chance);
  const basicOutcome = multiLevel ? multipleShotBasicAttack({skillLevel:multiLevel,weaponMin:Math.min(basicScenario.weaponMin,basicScenario.weaponMax),weaponMax:Math.max(basicScenario.weaponMin,basicScenario.weaponMax),otherEnhancedDamagePercent:basicScenario.otherED,baseAttackRating:basicScenario.baseAR,otherAttackRatingPercent:basicScenario.otherAR,monsterDefense:basicScenario.defense,attackerLevel:state.level,monsterLevel:basicScenario.monsterLevel,targetBlockPercent:basicScenario.targetBlock}) : null;
  const scenarioPhysical = basicScenario.useDamage && basicOutcome ? (basicOutcome.physicalMin+basicOutcome.physicalMax)/2 : combatScenario.physical;
  const buildCriticalChance = amazonCriticalStrikeChance(byId.get(9),current,activeBonus());
  const activeCriticalChance = critScenario.useBuild && buildCriticalChance !== null ? buildCriticalChance : combatScenario.crit;
  const combatOutcome = multipleShotTargetScenario({landedHitsInWindow:combatScenario.hits,physicalDamagePerHit:scenarioPhysical,criticalChance:activeCriticalChance,deadlyChance:combatScenario.deadly,crushingChance:combatScenario.crushing,openWoundsChance:combatScenario.wounds,openWoundsDamagePerSecond:combatScenario.woundDamage,currentTargetLife:combatScenario.life,attackerLevel:state.level});
  const criticalSkill = byId.get(9);
  const canAddCriticalPoint = critScenario.useBuild && buildCriticalChance !== null
    && (current[9] || 0) < criticalSkill.selected.maxLevel
    && pointsLeft() > 0
    && amazonAllocationIssues(criticalSkill,current,state.level,skills).length === 0;
  const nextCriticalChance = canAddCriticalPoint
    ? amazonCriticalStrikeChance(criticalSkill,{...current,9:(current[9] || 0)+1},activeBonus()) : null;
  const marginal = compareMarginalEffects({
    landedHitsInWindow:combatScenario.hits,physicalDamagePerHit:scenarioPhysical,
    criticalChance:activeCriticalChance,deadlyChance:combatScenario.deadly,
    crushingChance:combatScenario.crushing,openWoundsChance:combatScenario.wounds,
    openWoundsDamagePerSecond:combatScenario.woundDamage,currentTargetLife:combatScenario.life,attackerLevel:state.level,
    nextHardPointCriticalChance:nextCriticalChance,
  });
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
        ${[0,1].map(index => `<div class="bonus-setting"><span>Build ${index === 0 ? "A" : "B"} · +All Skills</span><span class="bonus-setting-value bonus-all-value">${state.bonuses[index].all}</span><span class="bonus-setting-stepper bonus-all-stepper"><button data-scope-bonus="all" data-bonus-build="${index}" data-delta="1" aria-label="Increase Build ${index === 0 ? "A" : "B"} all-skills bonus" ${state.bonuses[index].all >= 100 ? "disabled" : ""}>▲</button><button data-scope-bonus="all" data-bonus-build="${index}" data-delta="-1" aria-label="Decrease Build ${index === 0 ? "A" : "B"} all-skills bonus" ${state.bonuses[index].all <= 0 ? "disabled" : ""}>▼</button></span></div>`).join("")}
      </div>
      <div class="sandbox-settings">
        ${[0,1].map(index => `<fieldset><legend>Build ${index === 0 ? "A" : "B"} · +Tree Skills</legend>${[[1,"Bow & Crossbow"],[2,"Passive & Magic"],[3,"Javelin & Spear"]].map(([page,name]) => `<div class="bonus-setting"><span>${name}</span><span class="bonus-setting-value bonus-tree-value">${state.bonuses[index].trees[page]}</span><span class="bonus-setting-stepper bonus-tree-stepper"><button data-scope-bonus="tree" data-tree-bonus="${page}" data-bonus-build="${index}" data-delta="1" aria-label="Increase Build ${index === 0 ? "A" : "B"} ${name} bonus" ${state.bonuses[index].trees[page] >= 100 ? "disabled" : ""}>▲</button><button data-scope-bonus="tree" data-tree-bonus="${page}" data-bonus-build="${index}" data-delta="-1" aria-label="Decrease Build ${index === 0 ? "A" : "B"} ${name} bonus" ${state.bonuses[index].trees[page] <= 0 ? "disabled" : ""}>▼</button></span></div>`).join("")}</fieldset>`).join("")}
      </div>
      <div class="sandbox-summary">
        <strong>Build ${state.active === 0 ? "A" : "B"} · ${sum(current)} spent / ${state.budget} available · ${pointsLeft()} remaining</strong>
        ${buildIssues.map((issues,index) => issues.length ? `<p class="tree-warning">Build ${index ? "B" : "A"}: ${issues.length} allocation warning(s). ${escape(issues.slice(0,3).map(x=>x.skill+": "+x.message).join("; "))}${issues.length>3 ? "…" : ""}</p>` : "").join("")}
        <div class="sandbox-actions"><button data-copy="true">Copy build JSON</button><button data-import="true">Import build JSON</button><button data-build="0" aria-pressed="${state.active === 0}">Build A</button><button data-build="1" aria-pressed="${state.active === 1}">Build B</button><button data-reset="true">Clear current build</button></div>
      </div>
      <div class="annotation" role="group" aria-label="Import PD2 Armory character">
        <strong>Import from PD2 Armory (Build ${state.active ? "B" : "A"})</strong>
        <p>GitHub Pages cannot fetch the PD2 API directly because its response does not permit cross-origin browser requests. Open the official character JSON in a new tab, copy it, then paste or upload it here. No third-party proxy is used.</p>
        <div class="sandbox-actions">
          <label>Character name <input data-armory-name type="text" maxlength="24" value="${escape(armoryName)}" autocomplete="off"></label>
          <button data-armory-open="true" type="button">Open official character JSON</button>
        </div>
        <label>Character JSON <textarea data-armory-json rows="4" placeholder="Paste complete PD2 Armory character JSON">${escape(armoryDraft)}</textarea></label>
        <div class="sandbox-actions">
          <button data-armory-apply="true" type="button">Import pasted JSON into Build ${state.active ? "B" : "A"}</button>
          <label>Or upload JSON file <input data-armory-file type="file" accept=".json,application/json"></label>
        </div>
        <div role="status">${escape(armoryMessage)}</div>
      </div>
      ${armoryImports[state.active] ? `<p class="annotation">Armory: <strong>${escape(armoryImports[state.active].name)}</strong> · ${armoryImports[state.active].equippedCount} active equipped items · ${armoryImports[state.active].warnings.length} caveats. Raw item data is kept only for this page session; the existing exported build JSON remains skill-only. ${armoryImports[state.active].warnings.map(x=>escape(x)).join("; ")}</p>` : ""}
      <div class="sandbox-actions"><button data-page="1" aria-pressed="${state.page === 1}">Bow & Crossbow</button><button data-page="2" aria-pressed="${state.page === 2}">Passive & Magic</button><button data-page="3" aria-pressed="${state.page === 3}">Javelin & Spear</button></div>
      <div class="skill-tree" aria-label="Amazon skill tree">
        ${cards.map((skill) => {
          const id = skill.identity.internalId;
          const points = current[id];
          const reasons = amazonAllocationIssues(skill,current,state.level,skills);
          const locked = reasons.length > 0;
          return `<div class="tree-node ${state.selected === id ? "chosen" : ""}" style="grid-row:${resolveAmazonLayout(skill).row};grid-column:${resolveAmazonLayout(skill).column}">
            <button class="tree-skill" data-select="${id}" aria-pressed="${state.selected === id}"><span class="tree-glyph">✦</span><span>${escape(skill.identity.internalName)}</span></button>
            <div class="tree-points">${skillLevelBreakdown(skill, points)}<div class="tree-point-steppers"><span class="hard-point-controls"><button data-adjust="${id}" data-delta="1" aria-label="Add ${escape(skill.identity.internalName)} hard point" ${points >= skill.selected.maxLevel || pointsLeft() <= 0 || locked ? "disabled" : ""}>▲</button><button data-adjust="${id}" data-delta="-1" aria-label="Remove ${escape(skill.identity.internalName)} hard point" ${points === 0 ? "disabled" : ""}>▼</button></span><span class="skill-bonus-controls" title="Individual skill bonus levels (blue arrows)"><button class="skill-bonus-button" data-bonus-adjust="${id}" data-delta="-1" aria-label="Remove bonus level from ${escape(skill.identity.internalName)}" ${(activeBonus().skills[id] || 0) <= 0 ? "disabled" : ""}>▼</button><button class="skill-bonus-button" data-bonus-adjust="${id}" data-delta="1" aria-label="Add bonus level to ${escape(skill.identity.internalName)}" ${(activeBonus().skills[id] || 0) >= 100 ? "disabled" : ""}>▲</button></span></div></div>
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
        ${state.selected === 12 ? `<section class="multishot-scenario" aria-label="Multiple Shot proc research scenario">
          <h3>Multiple Shot · effect eligibility experiment</h3>
          <p class="annotation"><strong>Working S14 assumption:</strong> all ${multiArrows} launched arrows can apply Crushing Blow, Open Wounds, Blind and Slow <em>if they successfully hit</em>. The same equipped effect chance applies to each eligible hit; no arrow-position penalty or diminishing proc chance is assumed. This is <strong>not</strong> verified server behavior.</p>
          <p class="annotation">Deadly Strike and Critical Strike are separate physical-damage strike mechanics, historically available on all arrows; they must not be added as independent stacking effects. Knockback / Freeze Target are mentioned in secondary S14 sources, while on-striking spell casts remain unverified.</p>
          <div class="multishot-proc-inputs">
            <label>Successful eligible hits across targets <input data-proc-setting="hits" type="number" min="0" max="${multiArrows}" value="${scenarioHits}"></label>
            <label>Chance of one selected effect per hit (%) <input data-proc-setting="chance" type="number" min="0" max="100" value="${procScenario.chance}"></label>
          </div>
          <p class="multishot-proc-result"><strong>${procOutcome.expectedApplications.toFixed(2)}</strong> expected applications · <strong>${procOutcome.atLeastOnePercent.toFixed(2)}%</strong> chance of at least one application</p>
          <p class="annotation">These are independent Bernoulli trials <strong>per confirmed eligible hit</strong>, not per launched arrow. Even 25 arrows do not imply 25 hits on one monster. Hit chance, target geometry, Pierce, NextHit and effect-specific refresh/stack behavior are not modeled. Choose one effect at a time (e.g. 20% CB).</p>
          <h3>Basic weapon damage &amp; attack rating · S14 preview</h3>
          <p class="annotation">Enter <strong>already calculated bow damage</strong> (including on-weapon modifiers), base AR, and other applicable off-weapon damage / AR bonuses. Include Dexterity, auras and other modifiers in these manual bonus totals as appropriate; no gear parsing or Dexterity conversion is assumed. Target defense and level are manual. The PD2 S14 hit-chance formula, not vanilla's fixed 95% cap, is used.</p>
          <div class="multishot-proc-inputs">
            ${[["weaponMin","Bow minimum physical damage",0,10000000],["weaponMax","Bow maximum physical damage",0,10000000],["otherED","Other off-weapon enhanced damage %",-100,100000],["baseAR","Base attack rating before % bonuses",0,100000000],["otherAR","Other AR bonuses %",-100,100000],["defense","Monster defense",0,100000000],["monsterLevel","Monster level",1,150],["targetBlock","Monster block %",0,100]].map(([key,label,min,max])=>`<label>${label}<input data-basic-setting="${key}" type="number" min="${min}" max="${max}" value="${basicScenario[key]}"></label>`).join("")}
          </div>
          ${basicOutcome ? `<p class="multishot-proc-result">Per-arrow physical damage before strikes/resistance: <strong>${basicOutcome.physicalMin}–${basicOutcome.physicalMax}</strong> · Attack rating: <strong>${basicOutcome.attackRating}</strong> · Hit chance before block: <strong>${(basicOutcome.hitChance*100).toFixed(1)}%</strong> · After target block: <strong>${(basicOutcome.landedChance*100).toFixed(1)}%</strong></p>
            <p class="annotation">Multiple Shot skill bonuses at level ${multiLevel}: +${basicOutcome.skillDamagePercent}% physical ED and +${basicOutcome.skillAttackRatingPercent}% AR. These are additive with the applicable other % bonuses. This is damage <strong>per landed arrow</strong>, not 25× damage to one monster.</p>` : `<p class="annotation">Allocate or grant Multiple Shot to preview its weapon damage and attack-rating bonuses.</p>`}
          <label class="annotation"><input data-basic-toggle="damage" type="checkbox" ${basicScenario.useDamage ? "checked" : ""} ${!basicOutcome ? "disabled" : ""}> Feed mean calculated physical damage into the separate per-target combat scenario (otherwise keep the manually entered value).</label>
          <h3>Per-target combat effects · 5-second scenario</h3>
          <p class="annotation"><strong>Separate scenario:</strong> Enter observed or assumed landed hits on <em>one target over five seconds</em>, not arrows launched per volley. This does not estimate collision, Pierce, repeat hits or attack speed. All direct physical damage below is pre-resistance; CB and OW use the simplified target resistance assumption of 0%.</p>
          <label class="annotation"><input data-crit-mode="build" type="checkbox" ${critScenario.useBuild ? "checked" : ""} ${buildCriticalChance === null ? "disabled" : ""}> Use Build ${state.active === 0 ? "A" : "B"} Critical Strike passive automatically (${buildCriticalChance === null ? "unsupported source expression" : buildCriticalChance + "%" }).</label>
          <p class="annotation">Critical Strike used in calculations: <strong>${activeCriticalChance}%</strong> (${critScenario.useBuild && buildCriticalChance !== null ? "source-guarded build preview" : "manual setting"}). Bonus levels from +All/+Passive tree apply only when the passive is learned or directly granted by +Critical Strike; no hard points and no direct grant means 0%.</p>
          <div class="multishot-proc-inputs">
            ${[["hits","Landed hits on this target in 5s",0,100],["physical","Physical damage per landed hit (before strikes)",0,10000000],["crit","Manual Critical Strike % (used only when build auto-mode is off)",0,100],["deadly","Deadly Strike %",0,100],["crushing","Crushing Blow %",0,100],["wounds","Open Wounds chance %",0,100],["woundDamage","Open Wounds Damage Per Second (gear stat)",0,100000],["life","Current monster life",0,1000000000]].map(([key,label,min,max])=>`<label>${label}<input data-combat-setting="${key}" type="number" min="${min}" max="${max}" value="${combatScenario[key]}"></label>`).join("")}
          </div>
          <p class="annotation">Physical damage used by this scenario: <strong>${scenarioPhysical.toFixed(1)}</strong> per landed hit, ${basicScenario.useDamage && basicOutcome ? "mean of the calculated bow range" : "manual input"}.</p>
          <p class="multishot-proc-result">Expected physical damage: <strong>${combatOutcome.expectedPhysicalDamage.toFixed(1)}</strong> · Expected Crushing Blow damage at fixed current life: <strong>${combatOutcome.expectedCrushingDamageAtFixedLife.toFixed(1)}</strong></p>
          <p class="multishot-proc-result">Open Wounds expected active stacks: <strong>${combatOutcome.wounds.expectedActiveStacks.toFixed(2)} / 3</strong> · Estimated bleed: <strong>${combatOutcome.wounds.estimatedBleedDps.toFixed(1)} per second</strong></p>
          <h3>Marginal upgrades · compare one change at a time</h3>
          <p class="annotation">Each row changes <em>only one input</em> from the current scenario: +1 investable Critical Strike hard point (uses the S14 passive curve), or +10 percentage points of equipment DS, CB or OW chance (capped at 100%), or +10 Open Wounds Damage Per Second. No gear item or skill-point substitution is assumed. <strong>These are hypothetical upgrades, not equal-cost alternatives.</strong></p>
          <div class="marginal-comparison" role="table" aria-label="Marginal upgrade effects">
            <div class="marginal-row" role="row"><strong>Upgrade</strong><strong>Physical damage Δ / 5s hits</strong><strong>CB damage Δ / 5s hits</strong><strong>OW bleed Δ per second</strong></div>
            ${marginal.changes.map(change => `<div class="marginal-row" role="row">
              <span>${escape(change.label)}${change.available ? ` (${change.beforeChance.toFixed(0)}% → ${change.afterChance.toFixed(0)}%)` : ""}</span>
              ${change.available ? `<strong>+${change.delta.physicalDamage.toFixed(2)}</strong><strong>+${change.delta.crushingDamageAtFixedLife.toFixed(2)}</strong><strong>+${change.delta.openWoundsBleedDps.toFixed(2)}</strong>` : '<small>Unavailable</small><small>Requires eligible hard point and automatic build CS</small><small>—</small>'}
            </div>`).join("")}
          </div>
          <p class="annotation">All differences are vs the <strong>same active build and one-target hit assumptions</strong>; they are not directly rankable as a single score. Physical and CB columns are expected damage over manually specified hits (CB assumes fixed current life); OW is a steady five-second-window bleed DPS estimate. Real upgrades require actual item affixes, tradeoffs and attack timing.</p>
          <p class="annotation">Do not add these numbers as DPS: the first two represent expected damage over the specified hit opportunities, CB target life changes after damage, and OW is a steady-window bleed estimate. No per-target multi-arrow hit behavior is asserted. Default values are examples, <strong>not imported gear or target stats</strong>. Ordinary enemy, one player, ranged CB, zero physical resistance, no CB efficiency/OW flat bonus assumed.</p>
          <p class="annotation">Sources: <a href="https://pd2cheatsheet.com/" target="_blank" rel="noopener noreferrer">S14 changes</a> · <a href="https://github.com/coleestrin/pd2-tools/blob/7952f34719aa3a5cb41334a91fe36dbcbdd8be9c/api/src/game-data/pd2/season-14/Skills.txt" target="_blank" rel="noopener noreferrer">Pinned skill data (25-arrow cap)</a>. Proc probabilities and all-arrow eligibility are assumptions pending runtime verification.</p>
        </section>` : ""}
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
        ${skills.filter((skill) => state.builds.some((b, index) => b[skill.identity.internalId] > 0 || (state.bonuses[index].skills[skill.identity.internalId] || 0) > 0)).map((skill) => `<div><span>${escape(skill.identity.internalName)}</span><span>${formatSummaryLevel(skill,0)}</span><span>${formatSummaryLevel(skill,1)}</span></div>`).join("") || "<p>No points allocated yet.</p>"}</div>
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
  const applyArmoryPayload = payload => {
    const imported = importArmoryAmazon(payload,skills);
    const dest = state.active;
    state.builds[dest] = imported.build;
    state.bonuses[dest] = imported.bonus;
    state.level = imported.level; // Existing sandbox shares level across A/B.
    state.budget = Math.max(state.budget,sum(imported.build),sum(state.builds[1-dest]));
    armoryImports[dest] = {name:imported.name,equippedCount:payload.items.filter(i=>i.location?.zone==="Equipped" && i.location.equipment_id>=1 && i.location.equipment_id<=10).length,warnings:imported.warnings,source:payload};
    // Scratch combat scenarios are not gear-derived and remain unchanged.
    armoryMessage = `Imported ${imported.name} into Build ${dest?"B":"A"}. Supported skills and +skills loaded; combat inputs remain manual. Raw equipment is retained for this session only.`;
    persist(); redraw();
  };
  container.addEventListener("input", event => {
    if (event.target.matches("[data-armory-name]")) armoryName = event.target.value;
    if (event.target.matches("[data-armory-json]")) armoryDraft = event.target.value;
  });
  redraw();
  container.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button || !container.contains(button)) return;
    if (button.dataset.armoryOpen) {
      const name = armoryName.trim();
      if (!/^[A-Za-z][A-Za-z0-9_-]{1,23}$/.test(name)) {
        armoryMessage = "Enter a valid character name (2–24 letters/numbers, hyphen or underscore).";
        redraw(); return;
      }
      window.open(armoryCharacterUrl(name), "_blank", "noopener,noreferrer");
      armoryMessage = "Copy all JSON from the official PD2 Armory tab, return here, paste it, then click Import.";
      redraw(); return;
    }
    if (button.dataset.armoryApply) {
      try { applyArmoryPayload(JSON.parse(armoryDraft)); armoryDraft = ""; }
      catch (err) { armoryMessage = `Armory JSON import failed: ${err.message}`; redraw(); }
      return;
    }
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
    if (button.dataset.scopeBonus !== undefined) {
      const index = Number(button.dataset.bonusBuild);
      const delta = Number(button.dataset.delta);
      const page = Number(button.dataset.treeBonus);
      if ((index === 0 || index === 1) && (delta === 1 || delta === -1)) {
        const bonus = state.bonuses[index];
        if (button.dataset.scopeBonus === "all") bonus.all = Math.max(0, Math.min(100, bonus.all + delta));
        if (button.dataset.scopeBonus === "tree" && [1,2,3].includes(page)) bonus.trees[page] = Math.max(0, Math.min(100, bonus.trees[page] + delta));
      }
      persist(); redraw(); return;
    }
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
    if (event.target.matches("[data-armory-file]")) {
      const file = event.target.files?.[0]; if (!file) return;
      try { applyArmoryPayload(JSON.parse(await file.text())); armoryDraft = ""; }
      catch (err) { armoryMessage = `Armory JSON import failed: ${err.message}`; redraw(); }
      return;
    }
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
    const basicToggle = event.target.closest("[data-basic-toggle]");
    if (basicToggle) { basicScenario.useDamage = basicToggle.checked; redraw(); return; }
    const basicField = event.target.closest("[data-basic-setting]");
    if (basicField) {
      const key = basicField.dataset.basicSetting;
      const ranges = {weaponMin:[0,10000000],weaponMax:[0,10000000],otherED:[-100,100000],baseAR:[0,100000000],otherAR:[-100,100000],defense:[0,100000000],monsterLevel:[1,150],targetBlock:[0,100]};
      if (Object.hasOwn(ranges,key)) {
        basicScenario[key] = inputNumber(basicField.value,basicScenario[key],...ranges[key]);
        redraw(); return;
      }
    }
    const critToggle = event.target.closest("[data-crit-mode]");
    if (critToggle) { critScenario.useBuild = critToggle.checked; redraw(); return; }
    const combatField = event.target.closest("[data-combat-setting]");
    if (combatField) {
      const key = combatField.dataset.combatSetting;
      const bounds = { hits:100, physical:10000000, crit:100, deadly:100, crushing:100, wounds:100, woundDamage:100000, life:1000000000 };
      if (Object.hasOwn(bounds,key)) {
        combatScenario[key] = inputNumber(combatField.value, combatScenario[key], 0, bounds[key]);
        redraw(); return;
      }
    }
    const procField = event.target.closest("[data-proc-setting]");
    if (procField) {
      if (procField.dataset.procSetting === "chance") procScenario.chance = inputNumber(procField.value, procScenario.chance, 0, 100);
      if (procField.dataset.procSetting === "hits") procScenario.hits = inputNumber(procField.value, procScenario.hits, 0, 25);
      redraw(); return;
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
