import "./style.css";

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
          <span class="card-kicker">First tool</span>
          <h2>Skill Explorer</h2>
          <p>Inspect skill mechanics from versioned game data. Poison Strike will be the first vertical slice.</p>
          <span class="card-link">Open Skill Explorer →</span>
        </a>
      </div>
    </section>
  `);
}

function renderSkills() {
  return layout(`
    <section class="hero compact">
      <p class="eyebrow">PD2 Tools</p>
      <h1>Skill Explorer</h1>
      <p class="lede">A data-backed view of Project Diablo 2 skills.</p>
    </section>
    <section class="section notice">
      <p class="eyebrow">Coming next</p>
      <h2>Data pipeline not connected yet.</h2>
      <p>Phase B establishes this stable destination. Later roadmap phases will ingest, normalize, and display versioned skill data here, beginning with Necromancer Poison Strike.</p>
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
