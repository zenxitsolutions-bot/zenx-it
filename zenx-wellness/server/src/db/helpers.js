// Builds a `SET col = ?, col2 = ?` fragment + matching params from an explicit
// { patchKey: columnName } allowlist — plain SQL string assembly, not an ORM: every model decides
// its own allowed columns and passes them in.
export function buildSetClause(columnMap, patch) {
  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(columnMap)) {
    if (patch[key] !== undefined) {
      sets.push(`${column} = ?`);
      params.push(patch[key]);
    }
  }
  return { sets, params };
}
