import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PurchaseOrderStatus } from '@prisma/client';

export class UpdatePurchaseOrderStatusDto {
  @ApiProperty({
    enum: PurchaseOrderStatus,
    example: PurchaseOrderStatus.ORDERED,
    description: 'Only DRAFT→ORDERED, DRAFT→CANCELLED and ORDERED→CANCELLED are allowed here. RECEIVED/PARTIALLY_RECEIVED are set automatically by the /receive endpoint.',
  })
  @IsEnum(PurchaseOrderStatus)
  status: PurchaseOrderStatus;
}
