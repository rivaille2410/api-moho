import { Prisma } from '@prisma/client';

export function containsInsensitive(search?: string) {
  const value = search?.trim();
  if (!value) return undefined;

  return {
    contains: value,
    mode: Prisma.QueryMode.insensitive,
  } as const;
}

export function orContainsInsensitive<T extends string>(
  fields: T[],
  search?: string,
) {
  const filter = containsInsensitive(search);
  if (!filter) return undefined;

  return fields.map((field) => ({ [field]: filter }));
}
