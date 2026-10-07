import { StockMovementType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export const MANUAL_ADJUSTMENT_TYPES = [
  StockMovementType.ADJUSTMENT,
  StockMovementType.DAMAGED_OUT,
] as const;

export class CreateStockAdjustmentDto {
  @ApiPropertyOptional({
    description:
      'ID of the product variant to adjust. Takes priority over productId. ' +
      'Omit it when the product has no variants and pass productId instead.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({
    description:
      'ID of the product. Used only when variantId is not provided. ' +
      'If the product has no variant, a default variant is created automatically.',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({
    description: 'ID of the warehouse where the adjustment is applied.',
    format: 'uuid',
  })
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    description:
      'Signed change to apply to stock. Positive = add stock, negative = remove stock. Cannot be 0.',
    example: -3,
  })
  @IsInt()
  delta: number;

  @ApiPropertyOptional({
    enum: MANUAL_ADJUSTMENT_TYPES,
    default: StockMovementType.ADJUSTMENT,
    description: 'Reason type. DAMAGED_OUT requires a negative delta.',
  })
  @IsOptional()
  @IsIn(MANUAL_ADJUSTMENT_TYPES)
  type?: StockMovementType;

  @ApiPropertyOptional({
    description: 'Optional note explaining the adjustment.',
    example: 'Month-end stocktake, 3 items missing',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
