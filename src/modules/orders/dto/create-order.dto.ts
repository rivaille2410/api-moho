import {
  IsArray,
  IsEnum,
  IsString,
  IsOptional,
  IsDateString,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethod } from '@prisma/client';

import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  recipientName?: string;

  @ApiProperty({ example: '0901234567' })
  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @ApiProperty({ example: '123 Main Street, District 1, Ho Chi Minh City' })
  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @ApiProperty({ required: false, example: '2026-10-20' })
  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @ApiProperty({ required: false, example: 'clx1234-address-id' })
  @IsString()
  addressId: string;

  @ApiProperty({
    required: false,
    example: 'Please deliver during business hours',
  })
  @IsOptional()
  @IsString()
  note?: string;

  @ApiProperty({
    enum: PaymentMethod,
    required: false,
    example: PaymentMethod.COD,
    default: PaymentMethod.COD,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({ required: false, example: 'SUMMER2026' })
  @IsOptional()
  @IsString()
  voucherCode?: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
