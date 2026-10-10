import slugify from 'slugify';
import { BadRequestException } from '@nestjs/common';

const SLUGIFY_OPTIONS = {
  lower: true,
  locale: 'vi',
  strict: true,
} as const;

export function toSlug(value: string): string {
  return slugify(value, SLUGIFY_OPTIONS);
}

export async function ensureUniqueSlug(
  source: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  const baseSlug = toSlug(source);
  if (!baseSlug) {
    throw new BadRequestException('Unable to generate slug');
  }

  let slug = baseSlug;
  let suffix = 1;

  while (await isTaken(slug)) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}
