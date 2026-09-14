import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateStockAdjustmentDto {
  @ApiProperty()
  @IsUUID()
  variantId: string;

  @ApiProperty()
  @IsUUID()
  warehouseId: string;

  @ApiProperty({
    description:
      'Signed change to apply to stock. Positive = add stock, negative = remove stock. Cannot be 0.',
    example: -3,
  })
  @IsInt()
  delta: number;

  @ApiPropertyOptional({ example: 'Kiểm kê cuối tháng, lệch 3 sản phẩm' })
  @IsOptional()
  @IsString()
  note?: string;
}
