import { OrderStatus } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateOrderStatusDto {
  @ApiProperty({ enum: OrderStatus, example: OrderStatus.CONFIRMED })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiProperty({ required: false, example: 'Customer requested cancellation' })
  @ValidateIf((dto) => dto.status === OrderStatus.CANCELLED)
  @IsString()
  @IsOptional()
  cancelReason?: string;
}
