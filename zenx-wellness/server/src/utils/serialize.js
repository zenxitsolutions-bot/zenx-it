// Reconstructs the `_id` field Mongoose used to expose automatically, and lets callers drop
// internal-only columns (e.g. passwordHash) before a row reaches res.json(...).
export function toClientShape(row, omit = []) {
  if (!row) return row;
  const { id, ...rest } = row;
  for (const key of omit) delete rest[key];
  return { _id: id, ...rest };
}
