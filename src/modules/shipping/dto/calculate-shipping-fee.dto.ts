import {
  Min,
  IsInt,
  IsUUID,
  IsArray,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateShippingFeeItemDto {
  @ApiProperty({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsUUID()
  variantId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CalculateShippingFeeDto {
  @ApiProperty({ example: 79, description: 'Destination province code' })
  @IsInt()
  @Min(1)
  provinceCode: number;

  @ApiProperty({ type: [CalculateShippingFeeItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CalculateShippingFeeItemDto)
  items: CalculateShippingFeeItemDto[];
}

export class ShippingFeeResponseDto {
  @ApiProperty()
  zoneId: string;

  @ApiProperty({ example: 'Nội thành TP.HCM' })
  zoneName: string;

  @ApiProperty({ example: 180000, description: 'Shipping fee in VND' })
  fee: number;

  @ApiProperty({ example: false })
  isFreeShip: boolean;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 1200000,
    description:
      'How much more the customer must add to the cart to get free shipping (null if the zone has no free-ship threshold or it is already reached)',
  })
  amountToFreeShip: number | null;

  @ApiProperty({ example: 3800000, description: 'Cart subtotal (VND)' })
  subtotal: number;

  @ApiProperty({
    example: 34.5,
    description: 'Chargeable weight in kg (max of actual / volumetric)',
  })
  chargeableWeight: number;

  @ApiProperty({ type: Number, nullable: true, example: 1 })
  estimatedDaysMin: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3 })
  estimatedDaysMax: number | null;
}
