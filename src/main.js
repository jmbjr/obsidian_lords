import "./style.css";
import poisonStrike from "../pd2/generated/poison-strike.json";
import poisonStrikeS14 from "../pd2/overlays/season-14/poison-strike.json";

const routes = {
  "": renderHome,
  "#/": renderHome,
  "#/pd2": renderPd2,
  "#/pd2/skills": renderSkills,
};

function nav() {
  return `
    <header class="site-header">
      <a class="brand" href="#/">Obsidian Lords</a>
      <nav aria-label="Primary navigation">
        <a href="#/">Guild</a>
        <a href="#/pd2">PD2 Tools</a>
      </nav>
    </header>
  `;
}

function layout(content) {
  return `
    <div class="page">
      ${nav()}
      <main class="content">${content}</main>
      <footer>Obsidian Lords · Project Diablo 2 community tools</footer>
    </div>
  `;
}

function renderHome() {
  return layout(`
    <section class="hero">
      <p class="eyebrow">Guild</p>
      <h1>Obsidian Lords</h1>
      <p class="lede">A home for the guild, our resources, and the tools we build for Project Diablo 2.</p>
      <div class="actions"><a class="button" href="#/pd2">Explore PD2 Tools</a></div>
    </section>
    <section class="section">
      <p class="eyebrow">Site</p>
      <h2>Built for the guild.</h2>
      <p>Guild content will grow here independently from the PD2 analysis tools. For now, the shell gives both areas a stable home.</p>
    </section>
  `);
}

function renderPd2() {
  return layout(`
    <section class="hero compact">
      <p class="eyebrow">Project Diablo 2</p>
      <h1>PD2 Tools</h1>
      <p class="lede">Small, reproducible tools for understanding PD2 mechanics and exploring builds.</p>
    </section>
    <section class="section">
      <div class="card-grid">
        <a class="card" href="#/pd2/skills">
          <span class="card-kicker">Live</span>
          <h2>Skill Explorer</h2>
          <p>Inspect source-backed skill mechanics. Poison Strike is the first vertical slice.</p>
          <span class="card-link">Open Skill Explorer →</span>
        </a>
      </div>
    </section>
  `);
}

function field(label, value) {
  return `<div class="fact"><dt>${label}</dt><dd><code>${value}</code></dd></div>`;
}

function rawField(label, value, description = "") {
  return `
    <div class="raw-row">
      <div><code>${label}</code>${description ? `<span>${description}</span>` : ""}</div>
      <code class="raw-value">${value}</code>
    </div>
  `;
}

function renderSkills() {
  const skill = poisonStrike;
  const raw = skill.raw.skill;
  const desc = skill.raw.description;
  const source = skill.source;
  const overlay = poisonStrikeS14;
  const delta = overlay.changes[0];
  const commitShort = source.commit.slice(0, 12);

  return layout(`
    <section class="hero compact skill-hero">
      <p class="eyebrow">PD2 Tools · Skill Explorer</p>
      <h1>Poison Strike</h1>
      <p class="lede">A source-backed view of PD2's Necromancer poison melee skill. The pinned game table still identifies it internally as <code>${skill.identity.internalName}</code>.</p>
      <div class="source-warning">
        <strong>Season ${source.season} source data</strong>
        <span>The numeric/formula record below is Season ${source.season} game-table data. A separately sourced Season ${overlay.targetSeason} behavioral delta is shown below; it does not relabel these tables as S14.</span>
      </div>
    </section>

    <section class="section wide season-delta">
      <p class="eyebrow">Season ${overlay.targetSeason} patch-note overlay</p>
      <h2>Known Season ${overlay.targetSeason} change</h2>
      <div class="delta-card">
        <div class="delta-meta">
          <span>${delta.changeType}</span>
          <span>confidence: ${delta.confidence}</span>
        </div>
        <p>${delta.statement}</p>
        <p class="annotation">Source: <strong>${delta.source.title}</strong> · ${delta.source.section}. This is a behavioral correction. The patch notes provide no replacement numeric poison-pierce value, so the Season ${source.season} formula below remains unchanged.</p>
      </div>
    </section>

    <section class="section wide">
      <p class="eyebrow">Normalized facts</p>
      <h2>What the source directly tells us</h2>
      <dl class="facts">
        ${field("Internal ID", skill.identity.internalId)}
        ${field("Class code", skill.identity.classCode)}
        ${field("Required level", skill.selected.requiredLevel)}
        ${field("Max level", skill.selected.maxLevel)}
        ${field("Range code", skill.selected.rangeCode)}
        ${field("Item type codes", skill.selected.allowedItemTypeCodes.join(", "))}
        ${field("Element code", skill.selected.elementTypeCode)}
        ${field("Display string key", skill.identity.displayNameStringKey)}
      </dl>
      <p class="annotation">These are direct fields with minimal type conversion. Codes such as <code>knif</code>, <code>sc9</code>, and <code>pois</code> are deliberately left uninterpreted until we add authoritative mappings.</p>
    </section>

    <section class="section wide">
      <p class="eyebrow">Raw mechanics</p>
      <h2>Interesting formulas and parameters</h2>
      <p class="section-intro">These expressions are displayed exactly as they appear in the pinned game table. Labels beginning with an asterisk are source-column descriptions, not our interpretation.</p>
      <div class="raw-table">
        ${rawField("calc1", raw.calc1, raw["*calc1 desc"])}
        ${rawField("Param1", raw.Param1, raw["*Param1 Description"])}
        ${rawField("Param2", raw.Param2, raw["*Param2 Description"])}
        ${rawField("Param3", raw.Param3, raw["*Param3 Description"])}
        ${rawField("Param8", raw.Param8, raw["*Param8 Description"])}
        ${rawField("EDmgSymPerCalc", raw.EDmgSymPerCalc)}
        ${rawField("EMin", raw.EMin)}
        ${rawField("EMinLev1–5", [raw.EMinLev1, raw.EMinLev2, raw.EMinLev3, raw.EMinLev4, raw.EMinLev5].join(", "))}
        ${rawField("EMax", raw.EMax)}
        ${rawField("EMaxLev1–5", [raw.EMaxLev1, raw.EMaxLev2, raw.EMaxLev3, raw.EMaxLev4, raw.EMaxLev5].join(", "))}
        ${rawField("ELen", raw.ELen)}
        ${rawField("srvmissilea", raw.srvmissilea)}
      </div>
    </section>

    <section class="section wide">
      <p class="eyebrow">Description row</p>
      <h2>How the game describes the mechanic</h2>
      <div class="raw-table">
        ${rawField("desccalca4", desc.desccalca4, "paired with source string keys StrPierces / StrPercPoisRes")}
        ${rawField("dsc3calca2", desc.dsc3calca2, "source synergy display value")}
        ${rawField("dsc3calca3", desc.dsc3calca3, "source synergy display value")}
      </div>
    </section>

    <section class="section wide provenance">
      <p class="eyebrow">Provenance</p>
      <h2>Where this came from</h2>
      <dl class="facts">
        ${field("Season", source.season)}
        ${field("Repository", source.repository)}
        ${field("Commit", commitShort)}
        ${field("Schema", `v${skill.schemaVersion}`)}
      </dl>
      <p class="annotation">Generated from <code>${source.files.map((file) => file.name).join("</code> and <code>")}</code>. Regenerating the normalized artifact changes this page without duplicating skill constants in the UI.</p>
      <a class="text-link" href="#/pd2">← Back to PD2 Tools</a>
    </section>
  `);
}

function render() {
  const renderer = routes[window.location.hash] ?? renderHome;
  document.querySelector("#app").innerHTML = renderer();
}

window.addEventListener("hashchange", render);
render();
