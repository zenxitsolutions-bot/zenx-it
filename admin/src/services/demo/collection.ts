export function upsertInto<T extends { id: string }>(arr: T[], item: T): T[] {
  const idx = arr.findIndex((a) => a.id === item.id);
  if (idx === -1) return [item, ...arr];
  const next = [...arr];
  next[idx] = item;
  return next;
}

export function patchIn<T extends { id: string }>(
  arr: T[],
  id: string,
  patch: Partial<T>
): { list: T[]; item: T | null } {
  let item: T | null = null;
  const list = arr.map((a) => {
    if (a.id === id) {
      item = { ...a, ...patch };
      return item;
    }
    return a;
  });
  return { list, item };
}

export function findIn<T extends { id: string }>(arr: T[], id: string): T | null {
  return arr.find((a) => a.id === id) ?? null;
}
