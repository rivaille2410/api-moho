import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @ApiProperty()
  @IsUUID()
  variantId: string;

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(1)
  quantityOrdered: number;

  @ApiProperty({
    example: 1500000,
    description: 'Unit cost paid to the supplier',
  })
  @IsInt()
  @Min(0)
  unitCost: number;
}
