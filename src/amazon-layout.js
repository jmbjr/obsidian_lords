// Presentation coordinates are intentionally separate from Skills.txt mechanics.
// Source SkillDesc rows use 1-based grid positions except known invalid records.
// Avoid has row 0; row 1/column 2 is a provisional visual placement.
// Shattering Arrow has (0,0,0); keep it in a visible, allocatable unplaced tray
// until a Season 14 in-game screenshot confirms its position.
export const layoutOverrides = {
  18: { page: 2, row: 1, column: 2, status: "provisional", reason: "SkillDesc row 0 is not renderable; placement requires in-game verification" },
  365: { page: null, row: null, column: null, status: "unverified", reason: "SkillDesc has no usable tree coordinates; in-game verification required" },
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
