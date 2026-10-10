import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

export function uniqueConstraintTarget(
  error: Prisma.PrismaClientKnownRequestError,
): string[] {
  const target = error.meta?.target;
  return Array.isArray(target) ? (target as string[]) : [];
}

export function rethrowUniqueConstraint(
  error: unknown,
  slugMessage = 'Slug is already in use',
): never {
  if (isUniqueConstraintError(error)) {
    const target = uniqueConstraintTarget(error);

    if (target.includes('slug')) {
      throw new ConflictException({
        code: 'SLUG_ALREADY_IN_USE',
        message: slugMessage,
      });
    }

    throw new ConflictException({
      code: 'UNIQUE_CONSTRAINT_VIOLATION',
      message: `Field ${target.join(', ')} must be unique`,
    });
  }

  throw error;
}
