import {
  Min,
  IsInt,
  IsUUID,
  IsDate,
  IsArray,
  IsString,
  MaxLength,
  IsOptional,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateShipmentItemDto {
  @ApiProperty({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsUUID()
  orderItemId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateShipmentDto {
  @ApiProperty({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    type: [CreateShipmentItemDto],
    description:
      'Items in this shipment. Omit to ship everything that is not yet assigned to another shipment.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateShipmentItemDto)
  items?: CreateShipmentItemDto[];

  @ApiPropertyOptional({
    example: 'PT-2609-0012',
    maxLength: 100,
    description: 'Waybill / tracking code given by the carrier',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingCode?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  driverName?: string;

  @ApiPropertyOptional({ example: '0901234567', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  driverPhone?: string;

  @ApiPropertyOptional({ example: '51C-123.45', maxLength: 20 })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  vehiclePlate?: string;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Scheduled delivery time',
  })
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDate()
  scheduledAt?: Date;

  @ApiPropertyOptional({ example: 'Gọi khách trước 30 phút' })
  @IsOptional()
  @IsString()
  note?: string;
}
