import {
  Min,
  IsIn,
  IsDate,
  IsString,
  IsNumber,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ShipmentStatus } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateShipmentStatusDto {
  @ApiProperty({ enum: ShipmentStatus, example: ShipmentStatus.IN_TRANSIT })
  @IsIn(Object.values(ShipmentStatus))
  status: ShipmentStatus;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Actual delivery time (DELIVERED only). Defaults to now.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deliveredAt?: Date;

  @ApiPropertyOptional({
    example: 'Khách vắng nhà, hẹn giao lại',
    maxLength: 500,
    description: 'Required when status is FAILED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  failedReason?: string;

  @ApiPropertyOptional({
    example: 12500000,
    description:
      'COD amount collected by the shipper (DELIVERED only). Added to the order COD payment; the payment is confirmed once the total collected reaches the payment amount.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  collectedAmount?: number;
}
