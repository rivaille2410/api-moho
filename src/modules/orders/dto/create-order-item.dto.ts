import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsInt, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({
    example: 'a1b2c3d4-0000-0000-0000-000000000000',
    description: 'Product ID',
  })
  @IsUUID()
  productId: string;

  @ApiProperty({
    example: 'e5f6g7h8-0000-0000-0000-000000000000',
    description: 'Variant ID',
  })
  @IsUUID()
  variantId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
