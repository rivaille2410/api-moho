export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
) {
  const totalPages = limit > 0 ? Math.ceil(totalItems / limit) : 0;

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}
