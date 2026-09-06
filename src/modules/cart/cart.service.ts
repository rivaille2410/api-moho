import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

import { AddToCartDto } from './dto/add-to-cart.dto';
import { CART_INCLUDE, CartWithItems } from './cart.types';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(userId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(userId);
    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
  }

  async addItem(userId: string, dto: AddToCartDto): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(userId);

    return this.prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: dto.variantId },
        include: {
          product: { select: { status: true, deletedAt: true, name: true } },
        },
      });

      if (!variant || variant.product.deletedAt) {
        throw new NotFoundException('Variant not found');
      }
      if (variant.product.status !== 'ACTIVE') {
        throw new ConflictException({
          code: 'PRODUCT_UNAVAILABLE',
          message: `Product "${variant.product.name}" is no longer available`,
        });
      }

      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_variantId: { cartId: cart.id, variantId: dto.variantId },
        },
      });
      const nextQuantity = (existing?.quantity ?? 0) + dto.quantity;

      if (nextQuantity > variant.stock) {
        throw new ConflictException({
          code: 'OUT_OF_STOCK',
          message: `Only ${variant.stock} item(s) left for "${variant.name}"`,
        });
      }

      await tx.cartItem.upsert({
        where: {
          cartId_variantId: { cartId: cart.id, variantId: dto.variantId },
        },
        create: {
          cartId: cart.id,
          variantId: dto.variantId,
          quantity: dto.quantity,
        },
        update: { quantity: nextQuantity },
      });

      return tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: CART_INCLUDE,
      });
    });
  }

  async updateItem(
    userId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(userId);

    return this.prisma.$transaction(async (tx) => {
      const item = await tx.cartItem.findUnique({
        where: { id: itemId },
        include: { variant: { select: { stock: true, name: true } } },
      });

      if (!item || item.cartId !== cart.id) {
        throw new NotFoundException('Cart item not found');
      }
      if (dto.quantity > item.variant.stock) {
        throw new ConflictException({
          code: 'OUT_OF_STOCK',
          message: `Only ${item.variant.stock} item(s) left for "${item.variant.name}"`,
        });
      }

      await tx.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });

      return tx.cart.findUniqueOrThrow({
        where: { id: cart.id },
        include: CART_INCLUDE,
      });
    });
  }

  async removeItem(userId: string, itemId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(userId);

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
  }

  async clear(userId: string): Promise<CartWithItems> {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    return this.prisma.cart.findUniqueOrThrow({
      where: { id: cart.id },
      include: CART_INCLUDE,
    });
  }

  private async getOrCreateCart(userId: string) {
    return this.prisma.cart.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }
}
