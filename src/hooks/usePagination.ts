import { useMemo, useState } from 'react';

const ITEMS_PER_PAGE = 10;

export function usePagination<T>(items: T[], perPage = ITEMS_PER_PAGE) {
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const safeCurrentPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(() => {
    const start = (safeCurrentPage - 1) * perPage;
    return items.slice(start, start + perPage);
  }, [items, safeCurrentPage, perPage]);

  const goToPage = (p: number) => setPage(Math.max(1, Math.min(p, totalPages)));
  const nextPage = () => goToPage(safeCurrentPage + 1);
  const prevPage = () => goToPage(safeCurrentPage - 1);

  // Reset to page 1 when items change significantly
  const resetPage = () => setPage(1);

  return {
    items: paginatedItems,
    page: safeCurrentPage,
    totalPages,
    totalItems: items.length,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNext: safeCurrentPage < totalPages,
    hasPrev: safeCurrentPage > 1,
  };
}
