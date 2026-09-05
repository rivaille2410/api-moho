import {
  Min,
  Max,
  IsInt,
  IsEnum,
  IsArray,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  ValidateIf,
  ArrayMinSize,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType, VoucherScope, VoucherStatus } from '@prisma/client';

export class CreateVoucherDto {
  @ApiProperty({ example: 'SUMMER2026', description: 'Unique voucher code' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  code: string;

  @ApiProperty({ example: 'Summer sale 2026' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'Discount voucher for summer furniture collection',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: VoucherType, example: VoucherType.PERCENT })
  @IsEnum(VoucherType)
  type: VoucherType;

  @ApiProperty({
    example: 10,
    description: 'PERCENT: 0-100 value | FIXED: amount in VND',
  })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiPropertyOptional({
    example: 500000,
    description: 'Maximum discount amount, only applied when type = PERCENT',
  })
  @ValidateIf((o) => o.type === VoucherType.PERCENT)
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscount?: number;

  @ApiPropertyOptional({ example: 1000000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderValue?: number;

  @ApiProperty({ enum: VoucherScope, example: VoucherScope.ALL })
  @IsEnum(VoucherScope)
  scope: VoucherScope;

  @ApiPropertyOptional({
    type: [String],
    description: 'Required when scope = CATEGORY',
  })
  @ValidateIf((o) => o.scope === VoucherScope.CATEGORY)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Required when scope = PRODUCT',
  })
  @ValidateIf((o) => o.scope === VoucherScope.PRODUCT)
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productIds?: string[];

  @ApiPropertyOptional({
    example: 100,
    description: 'Total usage limit, omit for unlimited',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerUser?: number;

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  startAt: string;

  @ApiProperty({ example: '2026-08-31T23:59:59.000Z' })
  @IsDateString()
  endAt: string;

  @ApiPropertyOptional({ enum: VoucherStatus, default: VoucherStatus.DRAFT })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
