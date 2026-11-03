// Presentation coordinates are intentionally separate from Skills.txt mechanics.
// Source SkillDesc rows use 1-based grid positions except known invalid records.
// Avoid and Shattering Arrow remain in the imported historical S14 table,
// but neither belongs in the current playable tree. Keep both inspectable
// outside the main skill-tree grid (do not fabricate coordinates).
export const layoutOverrides = {
  18: { page: null, row: null, column: null, status: "historical", reason: "Avoid is not a current playable PD2 skill; native SkillDesc row 0 is not a playable tree coordinate" },
  365: { page: null, row: null, column: null, status: "historical", reason: "Shattering Arrow is not a current playable PD2 skill" },
};

export function resolveAmazonLayout(skill) {
  const id = skill.identity.internalId;
  if (layoutOverrides[id]) return layoutOverrides[id];
  const page = Number(skill.selected.skillPage);
  const row = Number(skill.selected.skillRow);
  const column = Number(skill.selected.skillColumn);
  if (![1, 2, 3].includes(page) || row < 1 || row > 6 || column < 1 || column > 3) {
    return { page: null, row: null, column: null, status: "unverified", reason: "Invalid source coordinates" };
  }
  return { page, row, column, status: "source", reason: "Native S14 SkillDesc coordinates; visual placement not independently verified" };
}

export function validateAmazonLayout(skills) {
  const occupied = new Set();
  const ids = new Set();
  for (const skill of skills) {
    const id = skill.identity.internalId;
    if (ids.has(id)) throw new Error(`Duplicate Amazon skill ID ${id}`);
    ids.add(id);
    const layout = resolveAmazonLayout(skill);
    if (layout.page === null) continue;
    const key = `${layout.page}:${layout.row}:${layout.column}`;
    if (occupied.has(key)) throw new Error(`Amazon tree collision at ${key}`);
    occupied.add(key);
  }
  return true;
}
