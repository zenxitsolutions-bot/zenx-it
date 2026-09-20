import { useEffect, useMemo, useState } from 'react';

// Keeps pagination behavior consistent across portal lists without pushing paging state into every
// API call. Screens can progressively move to server-side paging later without changing their UI.
export function usePagination(items, { pageSize = 20, resetKey } = {}) {
  const [page, setPage] = useState(1);
  const itemCount = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(itemCount / pageSize));

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (items ?? []).slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageItems, totalPages, itemCount, pageSize };
}
