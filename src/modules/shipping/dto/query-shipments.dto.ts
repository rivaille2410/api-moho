import { Type } from 'class-transformer';
import { ShipmentStatus } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Min,
  Max,
  IsIn,
  IsInt,
  IsDate,
  IsUUID,
  IsString,
  IsOptional,
} from 'class-validator';

export class QueryShipmentsDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Search by shipment code, tracking code, carrier, driver, order number, recipient name or phone',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ShipmentStatus })
  @IsOptional()
  @IsIn(Object.values(ShipmentStatus))
  status?: ShipmentStatus;

  @ApiPropertyOptional({ description: 'Only shipments of this order' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledFrom?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  scheduledTo?: Date;
}
