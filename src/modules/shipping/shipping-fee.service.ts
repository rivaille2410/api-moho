import {
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ProductStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

import {
  ShippingFeeResponseDto,
  CalculateShippingFeeDto,
  CalculateShippingFeeItemDto,
} from './dto/calculate-shipping-fee.dto';
import { VOLUMETRIC_DIVISOR } from './shipping.constants';

@Injectable()
export class ShippingFeeService {
  constructor(private readonly prisma: PrismaService) {}

  async calculate(
    dto: CalculateShippingFeeDto,
  ): Promise<ShippingFeeResponseDto> {
    const zone = await this.findZoneByProvince(dto.provinceCode);
    if (!zone) {
      throw new UnprocessableEntityException({
        code: 'SHIPPING_NOT_SUPPORTED',
        message: 'We do not deliver to this province yet',
      });
    }

    const { subtotal, chargeableWeight } = await this.summarizeItems(dto.items);

    const freeShipMin =
      zone.freeShipMinOrder !== null ? Number(zone.freeShipMinOrder) : null;
    const isFreeShip = freeShipMin !== null && subtotal >= freeShipMin;

    const extraKg = Math.max(
      0,
      Math.ceil(chargeableWeight - Number(zone.baseWeight)),
    );
    const fee = isFreeShip
      ? 0
      : Number(zone.baseFee) + extraKg * Number(zone.extraFeePerKg);

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      fee,
      isFreeShip,
      amountToFreeShip:
        freeShipMin !== null && !isFreeShip ? freeShipMin - subtotal : null,
      subtotal,
      chargeableWeight,
      estimatedDaysMin: zone.estimatedDaysMin,
      estimatedDaysMax: zone.estimatedDaysMax,
    };
  }

  private async findZoneByProvince(provinceCode: number) {
    const link = await this.prisma.shippingZoneProvince.findUnique({
      where: { provinceCode },
      include: { zone: true },
    });

    if (!link || link.zone.deletedAt || !link.zone.isActive) {
      return null;
    }
    return link.zone;
  }

  private async summarizeItems(items: CalculateShippingFeeItemDto[]) {
    const quantities = new Map<string, number>();
    for (const item of items) {
      quantities.set(
        item.variantId,
        (quantities.get(item.variantId) ?? 0) + item.quantity,
      );
    }

    const variants = await this.prisma.productVariant.findMany({
      where: {
        id: { in: [...quantities.keys()] },
        product: { deletedAt: null, status: ProductStatus.ACTIVE },
      },
      include: {
        product: {
          select: {
            price: true,
            length: true,
            width: true,
            height: true,
            weight: true,
          },
        },
      },
    });

    if (variants.length !== quantities.size) {
      throw new BadRequestException({
        code: 'VARIANTS_NOT_FOUND',
        message: 'One or more items are unavailable',
      });
    }

    let subtotal = 0;
    let chargeableWeight = 0;

    for (const variant of variants) {
      const quantity = quantities.get(variant.id) ?? 0;
      const { product } = variant;

      const unitPrice = Number(variant.priceOverride ?? product.price);
      subtotal += unitPrice * quantity;

      const volumetric =
        (Number(product.length ?? 0) *
          Number(product.width ?? 0) *
          Number(product.height ?? 0)) /
        VOLUMETRIC_DIVISOR;
      const unitWeight = Math.max(Number(product.weight ?? 0), volumetric);
      chargeableWeight += unitWeight * quantity;
    }

    return {
      subtotal,
      chargeableWeight: Math.round(chargeableWeight * 100) / 100,
    };
  }
}
