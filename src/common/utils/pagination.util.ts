import {
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from '@/common/constants/pagination.constants';
import type { PaginationMetaDto } from '@/common/dto/pagination-meta.dto';

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
  take: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMetaDto;
};

export function getPagination(
  query: { page?: number; limit?: number },
  defaultLimit = DEFAULT_LIMIT,
): PaginationParams {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? defaultLimit;
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    take: limit,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  totalItems: number,
): PaginationMetaDto {
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

export function paginated<T>(
  data: T[],
  page: number,
  limit: number,
  totalItems: number,
): PaginatedResult<T> {
  return {
    data,
    meta: buildPaginationMeta(page, limit, totalItems),
  };
}

export async function paginateQuery<T>(
  query: { page?: number; limit?: number },
  fetchPage: (args: { skip: number; take: number }) => Promise<[T[], number]>,
  defaultLimit = DEFAULT_LIMIT,
): Promise<PaginatedResult<T>> {
  const { page, limit, skip, take } = getPagination(query, defaultLimit);
  const [data, totalItems] = await fetchPage({ skip, take });
  return paginated(data, page, limit, totalItems);
}
