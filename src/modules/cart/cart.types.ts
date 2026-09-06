import { Prisma } from '@prisma/client';

export const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              sku: true,
              price: true,
              compareAtPrice: true,
              status: true,
              deletedAt: true,
              length: true,
              width: true,
              height: true,
              materials: { select: { label: true, value: true } },
              images: {
                where: { isThumbnail: true, variantId: null },
                take: 1,
                select: { url: true },
              },
            },
          },
          images: {
            where: { isThumbnail: true },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude;

export type CartWithItems = Prisma.CartGetPayload<{
  include: typeof CART_INCLUDE;
}>;
