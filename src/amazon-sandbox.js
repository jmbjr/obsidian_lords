import amazonSkills from "../pd2/generated/amazon-skills.json";
import { resolveAmazonLayout, validateAmazonLayout } from "./amazon-layout.js";
import { previewAmazonSkill } from "./amazon-formulas.js";
import { multishotProcScenario } from "./multishot-procs.js";
import { multipleShotTargetScenario } from "./multishot-combat.js";
import { multipleShotBasicAttack } from "./multishot-basic-attack.js";
import { amazonCriticalStrikeChance } from "./amazon-critical-strike.js";
import { armoryCharacterUrl, importArmoryAmazon, loadPublishedArmoryCharacter } from "./pd2-armory.js";
import { defaultEquipmentSettings, resolveEquipmentBuild } from "./amazon-equipment-controls.js";
import { projectArmoryCharacterSheet } from "./armory-character-sheet.js";
import { projectAmazonRangedAttack } from "./amazon-ranged-attack.js";
import { projectAmazonExtendedInfo } from "./amazon-extended-info.js";
import { buildArmoryDebugAudit } from "./amazon-armory-debug.js";
import { buildArmoryItemInspector } from "./armory-item-inspector.js";
import { renderArmoryItemInspector } from "./armory-item-inspector-view.js";
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
const equipmentSettings = [defaultEquipmentSettings(),defaultEquipmentSettings()];
const manualBonuses = [emptyBonus(),emptyBonus()];
const measuredBaseAttackRating = [null,null];
let armoryMessage = "";
let armoryName = "Magizon";
let armoryDraft = "";
let armorySyncStatus = "";
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
const editBonus = index => armoryImports[index] ? manualBonuses[index] : state.bonuses[index];
const recomputeGear = index => {
  const record = armoryImports[index];
  if (!record) return;
  const resolved = resolveEquipmentBuild(record.source,skills,manualBonuses[index],equipmentSettings[index]);
  state.bonuses[index] = resolved.bonus;
  record.selection = resolved.selection;
  record.equippedCount = resolved.selection.activeItems.length;
  record.skillSources = resolved.sources;
  record.unresolved = resolved.unresolved;
  record.equipmentBonus = resolved.equipmentBonus;
  record.sheet = projectArmoryCharacterSheet(record.source,equipmentSettings[index]);
};
const effectiveBonus = skill => bonusForSkill(skill, activeBonus());
const detachImportedGear = () => {
  for(const index of [0,1]){
    armoryImports[index]=null;
    manualBonuses[index]=emptyBonus();
    equipmentSettings[index]=defaultEquipmentSettings();
    measuredBaseAttackRating[index]=null;
  }
};
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
  const extendedInfo = armoryImports[state.active] ? projectAmazonExtendedInfo(
    armoryImports[state.active].source,skills,current,activeBonus(),equipmentSettings[state.active]) : null;
  const attackProjection = armoryImports[state.active] ? projectAmazonRangedAttack(
    armoryImports[state.active].source,skills,current,activeBonus(),
    {...equipmentSettings[state.active],baseAttackRatingOverride:measuredBaseAttackRating[state.active]}) : null;
  const armoryDebug = armoryImports[state.active] ? buildArmoryDebugAudit(
    armoryImports[state.active].source,skills,current,activeBonus(),
    equipmentSettings[state.active],attackProjection) : null;
  const armoryItems = armoryImports[state.active] ? buildArmoryItemInspector(armoryImports[state.active].source,equipmentSettings[state.active]) : null;
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
        <p>For a fresh character snapshot, use the owner-only GitHub workflow to sync PD2 data to our site. After that workflow finishes deploying Pages, load the latest published snapshot. Direct browser requests to PD2 remain blocked by CORS; manual JSON paste and file import are still available below.</p>
        <div class="sandbox-actions">
          <label>Character name <input data-armory-name type="text" maxlength="24" value="${escape(armoryName)}" autocomplete="off"></label>
          <a class="button" href="https://github.com/jmbjr/obsidian_lords/actions/workflows/sync-pd2-character.yml" target="_blank" rel="noopener noreferrer">Request GitHub sync</a>
          <button data-armory-load-published="true" type="button">Load latest published JSON</button>
          <button data-armory-open="true" type="button">Open official character JSON</button>
        </div>
        <p class="annotation">Sync is restricted to authorized GitHub accounts (currently jmbjr). On GitHub choose <strong>Run workflow</strong>, enter the same character name, and check that the workflow/deployment succeeds. Published snapshots are public; loading them does not require GitHub login.</p>
        <p class="annotation" role="status">${escape(armorySyncStatus)}</p>
        <label>Character JSON <textarea data-armory-json rows="4" placeholder="Paste complete PD2 Armory character JSON">${escape(armoryDraft)}</textarea></label>
        <div class="sandbox-actions">
          <button data-armory-apply="true" type="button">Import pasted JSON into Build ${state.active ? "B" : "A"}</button>
          <label>Or upload JSON file <input data-armory-file type="file" accept=".json,application/json"></label>
        </div>
        <div role="status">${escape(armoryMessage)}</div>
      </div>
      ${armoryImports[state.active] ? (() => {
        const record = armoryImports[state.active], settings = equipmentSettings[state.active];
        const selected = record.selection;
        const items = [...selected.activeItems, ...selected.inactiveItems.map(row => row.item)]
          .filter(item => ["shared-equipped","hand-main","hand-switch"].includes(item.scope))
          .sort((a,b)=>(a.slot??0)-(b.slot??0));
        return `<fieldset class="sandbox-inspector" aria-label="Build ${state.active?"B":"A"} equipment selection">
          <legend>Build ${state.active?"B":"A"} equipment · ${escape(record.name)}</legend>
          <p class="annotation">Two weapon sets switch <strong>only the hand slots</strong> (4/5 versus 11/12). Armor, jewelry and all other equipment remain shared. Gear and eligible charms contribute supported skills and stat projections; some final PD2 game-screen formulas remain incomplete.</p>
          <div class="sandbox-actions">
            <label>Weapon set
              <select data-equipment-set>
                <option value="main" ${settings.weaponSet==="main"?"selected":""}>Main (hands 4 and 5)</option>
                <option value="switch" ${settings.weaponSet==="switch"?"selected":""}>Alternate (hands 11 and 12)</option>
              </select>
            </label>
            <label><input type="checkbox" data-equipment-all ${settings.includeEquipment?"checked":""}> Include all equipment</label>
          </div>
          <p class="annotation">This is Build ${state.active?"B":"A"}'s independent configuration. Items on the inactive hand set are shown below but do not contribute until that set is selected.</p>
          <div class="comparison-skill-picker">
            ${items.map(item => {
              const excluded=settings.excludedItemIds.includes(item.id);
              const handInactive=(item.scope==="hand-main" && settings.weaponSet!=="main") || (item.scope==="hand-switch" && settings.weaponSet!=="switch");
              return `<label title="${escape(item.sourcePath)}">
                <input type="checkbox" data-equipment-item="${escape(item.id)}" ${excluded?"":"checked"}>
                ${escape(item.slotLabel || "Slot "+item.slot)}: ${escape(item.name || "Unnamed item")}
                <small>${handInactive?" (inactive weapon set)":!settings.includeEquipment?" (master equipment off)":excluded?" (excluded)":" (selected)"}</small>
              </label>`;
            }).join("")}
          </div>
          <fieldset aria-label="Active PD2 inventory charms">
            <legend>Active charms · bottom four inventory rows</legend>
            <p class="annotation">Only charms fully within rows 4–7 (zero-based) are active. Main and alternate weapon sets share the same charms. Charm effects are separate from the master equipped-gear toggle.</p>
            <label><input type="checkbox" data-charms-all ${settings.includeCharms?"checked":""}> Include eligible inventory charms (default on)</label>
            <p class="annotation">${selected.activeCharms.length} active · ${selected.inactiveCharms.length} inactive/excluded. Charms are retained by source position; malformed, overlapping or upper-half charms never activate.</p>
            <div class="comparison-skill-picker">
              ${[...selected.activeCharms,...selected.inactiveCharms.map(x=>x.item)]
                .filter(x=>x.scope==="inventory-charm-candidate")
                .sort((a,b)=>(a.position?.row??99)-(b.position?.row??99) || (a.position?.column??99)-(b.position?.column??99))
                .map(item=>{
                  const excluded=settings.excludedCharmIds.includes(item.id);
                  const invalid=selected.unresolvedItems.some(x=>x.item.id===item.id);
                  return `<label title="${escape(item.sourcePath)}">
                    <input type="checkbox" data-charm-item="${escape(item.id)}" ${excluded?"":"checked"} ${invalid?"disabled":""}>
                    ${escape(item.name||"Unnamed charm")} <small>(column ${item.position?.column??"?"}, row ${item.position?.row??"?"})${invalid?" inactive position":excluded?" excluded":!settings.includeCharms?" charm master off":""}</small>
                  </label>`;
                }).join("")}
            </div>
          </fieldset>
          <p class="annotation">Selected gear/charm skill bonuses: +${record.equipmentBonus.all} Amazon, Bow +${record.equipmentBonus.trees[1]}, Passive +${record.equipmentBonus.trees[2]}, Javelin +${record.equipmentBonus.trees[3]}; direct: ${Object.entries(record.equipmentBonus.skills).map(([id,n])=>escape(byId.get(Number(id))?.identity.internalName||id)+" +"+n).join(", ")||"none"}. ${record.unresolved.length} unsupported active skill modifier(s) preserved.</p>
          <p class="annotation">Manual blue-arrow bonuses are a separate scratch layer and persist when equipment is switched or excluded. Source snapshots are not modified. ${record.selection.unresolvedItems.length} unresolved, stashed, or mercenary records remain excluded from player skill calculations.</p>
        </fieldset>`;
      })() : ""}
      ${armoryImports[state.active]?.sheet ? (() => {
        const sheet=armoryImports[state.active].sheet;
        const attrs=[["Strength","strength"],["Dexterity","dexterity"],["Vitality","vitality"],["Energy","energy"]];
        const resists=[["Fire","fire"],["Cold","cold"],["Lightning","lightning"],["Poison","poison"]];
        const provenance=(sources)=>sources.map(entry=>`${escape(entry.item||entry.path)}: ${entry.amount>=0?"+":""}${entry.amount}`).join(" · ") || "No supported active item or charm contribution";
        return `<section class="sandbox-inspector" aria-label="Imported character sheet primitives">
          <h2>Character sheet · Build ${state.active?"B":"A"}</h2>
          <p class="annotation"><strong>Source-aware M5 preview:</strong> raw character fields, additive equipped and active-charm attributes and resistance contributions, item defense, flat AR, and raw weapon damage. These are <strong>not</strong> final in-game character sheet calculations. Equipment toggles recompute supported contributions, but unavailable formulas remain explicitly unknown.</p>
          <div class="character-stat-grid">
            <div><strong>Raw character</strong>
              <p>Level ${escape(sheet.character.level.value??"unknown")} · XP ${escape(sheet.character.experience.value??"unknown")}</p>
              <p>Unspent stat points ${escape(sheet.character.unspentStatPoints.value??"unknown")} · skill points ${escape(sheet.character.unspentSkillPoints.value??"unknown")}</p>
              <p>Life ${escape(sheet.resources.life.value??"unknown")} · Mana ${escape(sheet.resources.mana.value??"unknown")} · Stamina ${escape(sheet.resources.stamina.value??"unknown")}</p>
              <small>Life, mana and stamina are raw API readings, not rederived from the selected gear.</small>
            </div>
            <div><strong>Attributes · base + supported equipment</strong>
              ${attrs.map(([label,key])=>`<p>${label}: ${escape(sheet.attributes[key].base??"?")} + ${sheet.attributes[key].equipment} = <strong>${escape(sheet.attributes[key].value??"unknown")}</strong><small>${provenance(sheet.attributes[key].sources)}</small></p>`).join("")}
            </div>
            <div><strong>Resistance contributions · not final resistance</strong>
              ${resists.map(([label,key])=>`<p>${label}: <strong>+${sheet.resistances[key].equipment}% from selected gear</strong><small>${provenance(sheet.resistances[key].sources)}</small></p>`).join("")}
              <small>Difficulty, charms, caps, buffs and other modifiers not yet resolved.</small>
            </div>
            <div><strong>Defense / attack rating / weapon</strong>
              <p>Equipped item defense: <strong>${sheet.defense.equippedItems.value}</strong><small>${provenance(sheet.defense.equippedItems.sources)}</small></p>
              <p>Flat defense on non-armor items: <strong>+${sheet.defense.flatNonArmor.value}</strong><small>${provenance(sheet.defense.flatNonArmor.sources)}</small></p>
              <p>Known equipment + charm defense: <strong>${sheet.defense.knownEquipmentContribution.value}</strong></p>
              <p>Dexterity defense: <strong>${sheet.defense.fromDexterity.value??"Unknown"}</strong> · unmodified total: <strong>${sheet.defense.unmodified.value??"Unknown"}</strong></p>
              <p>Dexterity base AR: <strong>${sheet.attackRating.fromDexterity.value??"Unknown"}</strong> · flat gear + charms: <strong>+${sheet.attackRating.flatEquipment.value}</strong></p>
              <p>Unmodified base AR: <strong>${sheet.attackRating.baseTotal.value??"Unknown"}</strong><small>${provenance(sheet.attackRating.flatEquipment.sources)}</small></p>
              <p>Equipment AR bonus: <strong>+${sheet.attackRating.percentEquipment.value}%</strong></p>
              <p>${escape(sheet.weapon.name||"No weapon")} · raw physical damage: <strong>${sheet.weapon.physical.min??"?"}–${sheet.weapon.physical.max??"?"}</strong></p>
              <small>These are base/unmodified components; final defense buffs, skill AR and damage need further verified rules.</small>
            </div>
          </div>
          <p class="annotation">${sheet.unmodeledItemCount} source items remain unverified/stashed/mercenary and excluded. Eligible lower-inventory charms are included when enabled. Recheck runtime effects before claiming final parity.</p>
        </section>`;
      })() : ""}
      ${attackProjection ? `<section class="sandbox-inspector" aria-label="M6 imported attack projection">
        <h2>Ranged attack · Build ${state.active?"B":"A"} · M6</h2>
        <p class="annotation">Experimental <strong>Multiple Shot</strong> source-backed preview. The physical range is a partial calculation, not verified character-screen damage; it excludes charms and unresolved buffs. Equipment changes and hard-point adjustments recompute immediately.</p>
        <div class="character-stat-grid">
          <div><strong>Physical damage · partial</strong>
            <p>Multiple Shot level ${attackProjection.effective} · skill ED ${attackProjection.skillED===null?"unavailable":attackProjection.skillED+"%"}</p>
            <p>Resolved weapon ${escape(attackProjection.weapon.name||"none")}: ${attackProjection.weapon.physical.min??"?"}–${attackProjection.weapon.physical.max??"?"}</p>
            <p>Off-weapon flat min/max: +${attackProjection.contributions.offWeaponMin.value} / +${attackProjection.contributions.offWeaponMax.value}</p>
            <p>Off-weapon ED: +${attackProjection.contributions.offWeaponED.value}% · Dexterity ${attackProjection.contributions.dexterity.value??"?"}</p>
            <p>Estimated range: <strong>${attackProjection.physical.min??"—"}–${attackProjection.physical.max??"—"}</strong></p>
          </div>
          <div><strong>Attack rating · conditional</strong>
            <label>Override Dexterity-derived base AR with a measured value (optional)
              <input data-armory-base-ar type="number" min="0" max="100000000" placeholder="Unknown" value="${measuredBaseAttackRating[state.active]??""}">
            </label>
            <p>Flat equipment AR: +${attackProjection.contributions.flatAttackRating.value}</p>
            <p>Equipment AR %: +${attackProjection.contributions.percentAttackRating.value}% · Multiple Shot AR %: ${attackProjection.skillAR===null?"—":"+"+attackProjection.skillAR+"%"}</p>
            <p>Estimated selected-skill AR: <strong>${attackProjection.attackRating.value??"Not calculated"}</strong></p>
            <small>Base AR source: ${escape(attackProjection.attackRating.baseSource)} (${attackProjection.attackRating.baseWithoutEquipment??"unknown"}). The selected-skill AR calculation remains a partial estimate.</small>
            ${armoryDebug ? `<div class="ar-reference-summary" data-armory-source-info>
              <small>Current official Armory source · ${escape(armoryDebug.character)} · level ${escape(armoryDebug.level??"?")}</small>
              <p>Synced: <strong>${escape(armoryDebug.syncedAt||"unknown")}</strong> · ${armoryDebug.activeGear} equipped items · ${armoryDebug.activeCharms} active charms</p>
              <small>Selected-skill AR is <strong>not</strong> published in the Armory JSON. Our current computed estimate is <strong>${attackProjection.attackRating.value??"unavailable"}</strong>.</small>
            </div>
            <details class="ar-debug-parity" data-armory-debug>
              <summary>Debug · current Armory JSON vs calculated values</summary>
              <div class="ar-debug-content">
                <p class="annotation">${escape(armoryDebug.warning)}</p>
                <p class="annotation"><strong>Calculation tiers:</strong> ${Object.values(armoryDebug.calculationTiers).map(tier=>`<strong>${escape(tier.label)}</strong> — ${escape(tier.description)}`).join(" · ")}</p>
                <p class="annotation"><strong>Loaded:</strong> ${escape(armoryDebug.character)} · ${escape(armoryDebug.syncedAt||"sync time unavailable")} · ${escape(armoryDebug.selectedSet)} weapon set. Recomputed from the currently selected equipment and inventory charms, not an old screenshot.</p>
                ${renderArmoryItemInspector(armoryItems,escape)}
                ${armoryDebug.groups.map(group=>{
                  const rows=armoryDebug.rows.filter(row=>row.group===group);
                  return `<details class="armory-debug-group" ${group==="Attack rating"||group==="Calculated — not directly in JSON"?"open":""}>
                    <summary>${escape(group)} · ${rows.length} fields</summary>
                    <div class="armory-debug-rows">
                      ${rows.map(row=>`<div class="armory-debug-row">
                        <strong>${escape(row.label)}</strong>
                        <p class="annotation"><strong>Calculation tier:</strong> ${escape(armoryDebug.calculationTiers[row.calculationTier].label)}</p>
                        <div class="armory-debug-values">
                          <span><small>${row.calculationTier==="raw"?"Direct official JSON field":row.kind==="calculation-only"?"Direct JSON total (not published)":"Independent JSON source sum"}</small><b>${row.armoryValue===null?"Not provided":escape(row.armoryValue)}</b></span>
                          <span><small>Our ${row.calculationTier==="raw"?"parsed value":row.calculationTier==="aggregation"?"aggregation":row.calculationTier==="baseFormula"?"base formula":"skill estimate"}</small><b>${row.computedValue===null?"Unavailable":escape(row.computedValue)}</b></span>
                          <span><small>Δ model − comparable source</small><b>${row.delta===null?"N/A":escape((row.delta>0?"+":"")+row.delta)}</b></span>
                        </div>
                        <small>${escape(row.status)} · ${escape(row.note)}</small>
                        ${row.sources.length?`<details class="ar-debug-row-source">
                          <summary>Inspect ${row.sources.length} JSON source${row.sources.length===1?"":"s"}</summary>
                          <ul>${row.sources.map(e=>`<li>${escape(e.item||e.kind||"Armory field")} · <code>${escape(e.sourcePath)}</code> · ${escape(e.modifier||"")} ${escape(e.amount??"unknown")}</li>`).join("")}</ul>
                        </details>`:""}
                      </div>`).join("")}
                    </div>
                  </details>`;
                }).join("")}
              </div>
            </details>` : ""}
            <details class="ar-calculation-breakdown" data-ar-breakdown>
              <summary>Show full AR calculation · intermediate values and sources</summary>
              ${(() => {
                const ar=attackProjection.attackRating.breakdown;
                const value=n=>n===null||n===undefined?"Unavailable":escape(n);
                const trace=(list)=>list?.length?`<ul>${list.map(src=>`<li><strong>${escape(src.item||src.path||src.sourcePath||"Attribute source")}</strong>: ${src.amount>=0?"+":""}${escape(src.amount)} <small>(${escape(src.sourcePath||src.path||"source unavailable")})</small></li>`).join("")}</ul>`:"<p>No item modifiers currently contribute to this term.</p>";
                return `<div class="ar-calculation-steps">
                  <p class="annotation"><strong>Current model, not a verified final PD2 formula.</strong> All steps below are calculated from Build ${state.active?"B":"A"}'s active weapon set, equipment, charms, skill levels and any measured override.</p>
                  <ol>
                    <li><strong>Effective Dexterity:</strong> ${value(ar.dexterity)}
                      <details><summary>Dexterity sources</summary>${trace(ar.dexSources)}</details>
                    </li>
                    <li><strong>Base AR from Dexterity:</strong> ${ar.baseSource==="dexterity-derived"?
                      `5 × ${value(ar.dexterity)} − 30 = ${value(ar.derivedFormula)}`:
                      `Measured base AR override = ${value(ar.baseAR)} (Dexterity-derived value replaced)`}
                    </li>
                    <li><strong>Flat AR from selected gear and active charms:</strong> ${value(ar.flatAR)}
                      <details><summary>Flat AR item sources</summary>${trace(ar.flatSources)}</details>
                    </li>
                    <li><strong>Base AR before percentage bonuses:</strong> ${value(ar.baseAR)} + ${value(ar.flatAR)} = <strong>${value(ar.additiveBase)}</strong></li>
                    <li><strong>Multiple Shot effective level:</strong> ${value(ar.hardPoints)} hard + ${value(ar.skillLevelBonus)} supported +skills = <strong>${value(ar.skillLevel)}</strong>.
                      <small>Manual/equipment bonuses use the existing skill resolver; this does not convert equipment +skills to hard points.</small>
                    </li>
                    <li><strong>Multiple Shot AR bonus:</strong> ${ar.skillFormula===null?"Unavailable":
                      `8 + 6 × (${value(ar.skillLevel)} − 1) = ${value(ar.skillARPercent)}%`}
                    </li>
                    <li><strong>Additional equipment AR percentage:</strong> ${value(ar.gearARPercent)}%
                      <details><summary>Percentage AR item sources</summary>${trace(ar.percentSources)}</details>
                    </li>
                    <li><strong>Total modeled AR percentage:</strong> ${value(ar.skillARPercent)}% + ${value(ar.gearARPercent)}% = <strong>${value(ar.totalPercent)}%</strong> (multiplier ${value(ar.multiplier)})</li>
                    <li><strong>Multiply and truncate:</strong> ${value(ar.additiveBase)} × ${value(ar.multiplier)} = ${value(ar.unrounded)} → trunc, minimum zero = <strong>${value(ar.value)}</strong></li>
                  </ol>
                  <p class="annotation"><strong>Exact implemented expression:</strong> <code>${escape(ar.equation)}</code></p>
                  ${ar.internalCheck?`<p class="annotation">${escape(ar.internalCheck)}</p>`:""}
                  <p class="annotation"><strong>Unverified:</strong> passive, aura, buff and conditional AR effects; whether PD2 combines AR percentages in this exact order; possible screenshot state differences. No final in-game AR number is supplied by the Armory JSON.</p>
                </div>`;
              })()}
            </details>

          </div>
          <div><strong>Amazon attack frames · sourced A1 model</strong>
            <p>Selected weapon: ${escape(attackProjection.weapon.name||"none")} · base code ${escape(attackProjection.weapon.baseCode||"unknown")}</p>
            <p>Selected gear + charm IAS: <strong>${attackProjection.contributions.ias.value}%</strong></p>
            <p>WSM ${attackProjection.speed.wsm??"?"} · EIAS ${attackProjection.speed.eias??"?"}</p>
            <p>Frames per attack: <strong>${attackProjection.speed.frames??"Unknown"}</strong>${attackProjection.speed.frames!==null?" (25 FPS / "+(25/attackProjection.speed.frames).toFixed(2)+" attacks/s)":""}</p>
            <small>PD2 A1 animation; assumes zero aura/skill speed and no slows. Compare against in-game breakpoint display; may differ in runtime.</small>
          </div>
        </div>
        <p class="annotation">These projections are based on the active ${escape(equipmentSettings[state.active].weaponSet)} hand set, and change with item toggles. The combat sandbox's separate manual target inputs are intentionally unchanged.</p>
      </section>` : ""}
      ${extendedInfo ? `<section class="sandbox-inspector" aria-label="M7 Extended Info 8">
        <h2>Extended Info (8) · Build ${state.active?"B":"A"}</h2>
        <p class="annotation">Source-aware equipment contributions, not a claim of final in-game totals. Values recalculate for this build's <strong>${escape(extendedInfo.weaponSet)}</strong> weapon set and individual gear toggles. Unsupported final values remain unavailable, not zero. The catalog is divided into source groups; expand a stat to see its item provenance.</p>
        <div class="extended-info-catalog">
          ${extendedInfo.categories.map((category,i) => {
            const rows=extendedInfo.rows.filter(row=>row.category===category);
            return `<details class="extended-category" ${i===0||category==="Critical & procs"||category==="Speed"?"open":""}>
              <summary>${escape(category)} <small>${rows.length} fields</small></summary>
              <div class="extended-stat-list">
              ${rows.map(row=>{
                const measured=row.status==="skill-preview"||row.status==="source-derived";
                const value=measured?row.finalValue:row.equipmentValue;
                const shown=value===null?"Not calculated":typeof value==="object"?
                  `${value.min}–${value.max}${row.unit}`:
                  `${value>=0&&row.unit!=="flags"?"+":""}${value}${row.unit||""}`;
                const suffix=measured?"skill/animation preview":row.status==="equipment-only"?"equipment only":"unsupported";
                return `<details class="extended-stat" data-extended-id="${escape(row.id)}">
                  <summary><span>${escape(row.label)}</span><strong>${escape(shown)}</strong><small>${escape(suffix)}</small></summary>
                  <div class="annotation"><p>${escape(row.note)}</p>
                  ${row.sources.length?`<ul>${row.sources.map(src=>`<li>${escape(src.item||"Skill source")} · ${escape(src.sourcePath)}: ${escape(src.min===undefined?src.amount:`${src.min}–${src.max}${src.duration===null?"":` (duration ${src.duration})`}`)}</li>`).join("")}</ul>`:"<p>No supported active item source for this field.</p>"}
                  ${row.unresolved.length?`<p>${row.unresolved.length} unsupported matching tuple(s) retained for review.</p>`:""}
                  </div>
                </details>`;
              }).join("")}
              </div>
            </details>`;
          }).join("")}
        </div>
        <p class="annotation">${extendedInfo.unmappedScopeCount} stored/charm/mercenary records remain outside verified player gear scope. Crushing Blow, Deadly Strike, Open Wounds chance, and Open Wounds DPS are distinct statistics. Critical Strike comes from the skill resolver and does not combine additively with Deadly Strike here.</p>
      </section>` : ""}
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
            <div class="tree-points">${skillLevelBreakdown(skill, points)}<div class="tree-point-steppers"><span class="hard-point-controls"><button data-adjust="${id}" data-delta="1" aria-label="Add ${escape(skill.identity.internalName)} hard point" ${[18,365].includes(id) || points >= skill.selected.maxLevel || pointsLeft() <= 0 || locked ? "disabled" : ""}>▲</button><button data-adjust="${id}" data-delta="-1" aria-label="Remove ${escape(skill.identity.internalName)} hard point" ${points === 0 ? "disabled" : ""}>▼</button></span><span class="skill-bonus-controls" title="Individual skill bonus levels (blue arrows)"><button class="skill-bonus-button" data-bonus-adjust="${id}" data-delta="-1" aria-label="Remove bonus level from ${escape(skill.identity.internalName)}" ${(activeBonus().skills[id] || 0) <= 0 ? "disabled" : ""}>▼</button><button class="skill-bonus-button" data-bonus-adjust="${id}" data-delta="1" aria-label="Add bonus level to ${escape(skill.identity.internalName)}" ${[18,365].includes(id) || (activeBonus().skills[id] || 0) >= 100 ? "disabled" : ""}>▲</button></span></div></div>
            ${locked ? `<small class="tree-warning">${escape(reasons.join("; "))}</small>` : ""}${resolveAmazonLayout(skill).status === "provisional" ? '<small class="tree-warning">Provisional position</small>' : ""}
          </div>`;
        }).join("")}
      </div>
      ${unplaced.length ? `<p class="annotation">Historical / removed source skills (inspect only; not part of the playable tree): ${unplaced.map((s) => escape(s.identity.internalName)).join(", ")}. These source records remain inspectable; they are not player-selectable in the current PD2 tree.</p><div class="sandbox-actions">${unplaced.map((s) => `<button data-select="${s.identity.internalId}">${escape(s.identity.internalName)}</button>`).join("")}</div>` : ""}
      <section class="sandbox-inspector">
        <h2>${escape(selected.identity.internalName)}</h2>
        ${[18,365].includes(state.selected) ? `<p class="annotation"><strong>Historical / removed skill:</strong> ${state.selected===18?"Avoid is not in the current Passive & Magic skill tree; the archived SkillDesc row is 0.":"Shattering Arrow was removed before release but remains in the source table."} This is retained for inspection only; it is not a playable skill.</p>` : ""}
        <p class="annotation">Required level ${selected.selected.requiredLevel} · hard points ${current[state.selected]} · effective skill level ${current[state.selected] || (activeBonus().skills[state.selected] || 0) ? current[state.selected] + effectiveBonus(selected) : 0} (+all, +tree and +skill bonuses; hard points remain capped at 20)</p>
        <p class="annotation">Individual bonus levels for this skill: +${activeBonus().skills[state.selected] || 0}. Use the blue + / − controls beside its tree node to adjust.</p>
        <div class="tree-points"><button data-adjust="${state.selected}" data-delta="-1" ${current[state.selected] === 0 ? "disabled" : ""}>−</button><strong>${current[state.selected]} / ${selected.selected.maxLevel}</strong><button data-adjust="${state.selected}" data-delta="1" ${[18,365].includes(state.selected) || current[state.selected] >= selected.selected.maxLevel || pointsLeft() <= 0 || amazonAllocationIssues(selected,current,state.level,skills).length ? "disabled" : ""}>+</button></div>
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
  const persist = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify({version:1,level:state.level,budget:state.budget,bonuses:state.bonuses.map((bonus,index)=>armoryImports[index]?manualBonuses[index]:bonus),builds:state.builds,comparison:state.comparison})); } catch { /* storage unavailable */ } };
  const redraw = () => { container.innerHTML = renderAmazonSandbox(); };
  const fullSnapshot = () => ({format:"obsidian-lords-amazon-comparison",version:1,level:state.level,budget:state.budget,builds:state.builds,bonuses:state.bonuses,comparison:state.comparison});
  const copyJson = value => { const text = JSON.stringify(value,null,2); if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => window.prompt("Copy JSON:",text)); else window.prompt("Copy JSON:",text); };
  const applyArmoryPayload = payload => {
    const imported = importArmoryAmazon(payload,skills);
    const dest = state.active;
    const initialSettings = defaultEquipmentSettings();
    const resolved = resolveEquipmentBuild(payload,skills,emptyBonus(),initialSettings);
    state.builds[dest] = imported.build;
    manualBonuses[dest] = emptyBonus();
    equipmentSettings[dest] = initialSettings;
    measuredBaseAttackRating[dest] = null;
    state.bonuses[dest] = resolved.bonus;
    state.level = imported.level; // Existing sandbox shares level across A/B.
    state.budget = Math.max(state.budget,sum(imported.build),sum(state.builds[1-dest]));
    armoryImports[dest] = {name:imported.name,equippedCount:resolved.selection.activeItems.length,warnings:imported.warnings,source:payload};
    recomputeGear(dest);
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
    if (button.dataset.armoryLoadPublished) {
      const name = armoryName.trim();
      armorySyncStatus = "Loading published character snapshot…";
      redraw();
      try {
        const payload = await loadPublishedArmoryCharacter(name,import.meta.env.BASE_URL);
        applyArmoryPayload(payload);
        armorySyncStatus = `Published snapshot for ${payload.character.name} synced at ${payload._obsidianLordsSync.syncedAt} (UTC). Loaded into Build ${state.active?"B":"A"}.`;
        redraw();
      } catch(err) {
        armorySyncStatus = `Could not load published character: ${err.message}`;
        redraw();
      }
      return;
    }
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
      try { const saved = normalizeBuildSnapshot(JSON.parse(text), skills); if (!saved) throw new Error("Invalid build format"); Object.assign(state,saved); detachImportedGear(); state.comparison = normalizeComparisonConfig(JSON.parse(text).comparison,skills) || state.comparison; persist(); redraw(); }
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
        const bonus = editBonus(index);
        if (button.dataset.scopeBonus === "all") bonus.all = Math.max(0, Math.min(100, bonus.all + delta));
        if (button.dataset.scopeBonus === "tree" && [1,2,3].includes(page)) bonus.trees[page] = Math.max(0, Math.min(100, bonus.trees[page] + delta));
        recomputeGear(index);
      }
      persist(); redraw(); return;
    }
    if (button.dataset.bonusAdjust !== undefined) {
      const id = Number(button.dataset.bonusAdjust);
      const delta = Number(button.dataset.delta);
      if (byId.has(id) && ![18,365].includes(id) && (delta === 1 || delta === -1)) {
        const bonus = editBonus(state.active);
        bonus.skills[id] = Math.max(0, Math.min(100, (bonus.skills[id] || 0) + delta));
        recomputeGear(state.active);
      }
    }
    if (button.dataset.adjust !== undefined) {
      const id = Number(button.dataset.adjust);
      const delta = Number(button.dataset.delta);
      const skill = byId.get(id);
      const current = activeBuild()[id];
      if (skill && ![18,365].includes(id) && ((delta === 1 && current < skill.selected.maxLevel && pointsLeft() > 0 && amazonAllocationIssues(skill,activeBuild(),state.level,skills).length === 0) || (delta === -1 && current > 0))) activeBuild()[id] += delta;
    }
    persist();
    redraw();
  });
  container.addEventListener("change", async (event) => {
    if (event.target.matches("[data-armory-base-ar]")) {
      if (!armoryImports[state.active]) return;
      const value=event.target.value.trim();
      if (value!=="" && (!/^\\d+$/.test(value) || Number(value)>100000000)) return;
      measuredBaseAttackRating[state.active] = value===""?null:Number(value);
      redraw();return;
    }
    if (event.target.matches("[data-charms-all]")) {
      if (!armoryImports[state.active]) return;
      equipmentSettings[state.active].includeCharms = event.target.checked;
      recomputeGear(state.active);persist();redraw();return;
    }
    if (event.target.matches("[data-charm-item]")) {
      if (!armoryImports[state.active]) return;
      const id=event.target.dataset.charmItem;
      const settings=equipmentSettings[state.active];
      const excluded=new Set(settings.excludedCharmIds);
      if(event.target.checked)excluded.delete(id);else excluded.add(id);
      settings.excludedCharmIds=[...excluded];
      recomputeGear(state.active);persist();redraw();return;
    }
    if (event.target.matches("[data-equipment-set]")) {
      const value = event.target.value;
      if (!["main","switch"].includes(value) || !armoryImports[state.active]) return;
      equipmentSettings[state.active].weaponSet = value;
      recomputeGear(state.active);persist();redraw();return;
    }
    if (event.target.matches("[data-equipment-all]")) {
      if (!armoryImports[state.active]) return;
      equipmentSettings[state.active].includeEquipment = event.target.checked;
      recomputeGear(state.active);persist();redraw();return;
    }
    if (event.target.matches("[data-equipment-item]")) {
      if (!armoryImports[state.active]) return;
      const id=event.target.dataset.equipmentItem;
      const settings=equipmentSettings[state.active];
      const excluded=new Set(settings.excludedItemIds);
      if (event.target.checked) excluded.delete(id); else excluded.add(id);
      settings.excludedItemIds=[...excluded];
      recomputeGear(state.active);persist();redraw();return;
    }
    if (event.target.matches("[data-armory-file]")) {
      const file = event.target.files?.[0]; if (!file) return;
      try { applyArmoryPayload(JSON.parse(await file.text())); armoryDraft = ""; }
      catch (err) { armoryMessage = `Armory JSON import failed: ${err.message}`; redraw(); }
      return;
    }
    if (event.target.matches("[data-full-file]")) {
      const file = event.target.files?.[0]; if (!file) return;
      try { const parsed = normalizeFullComparison(JSON.parse(await file.text()),skills); if (!parsed) throw Error("Invalid full comparison"); Object.assign(state,parsed); detachImportedGear(); persist(); redraw(); }
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
