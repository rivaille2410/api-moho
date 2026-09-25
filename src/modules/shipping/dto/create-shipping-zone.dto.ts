import {
  Min,
  IsInt,
  IsArray,
  IsString,
  IsNumber,
  MaxLength,
  MinLength,
  IsBoolean,
  IsOptional,
  ArrayMinSize,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShippingZoneProvinceDto {
  @ApiProperty({ example: 79, description: 'Province / city code' })
  @IsInt()
  @Min(1)
  provinceCode: number;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  provinceName: string;
}

export class CreateShippingZoneDto {
  @ApiProperty({ example: 'Nội thành TP.HCM', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({
    type: [ShippingZoneProvinceDto],
    description: 'Each province can belong to only one zone',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShippingZoneProvinceDto)
  provinces: ShippingZoneProvinceDto[];

  @ApiProperty({ example: 150000, description: 'Base fee in VND' })
  @IsNumber()
  @Min(0)
  baseFee: number;

  @ApiPropertyOptional({
    example: 30,
    default: 0,
    description: 'Weight (kg) already covered by the base fee',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseWeight?: number;

  @ApiPropertyOptional({
    example: 5000,
    default: 0,
    description: 'Extra fee (VND) for each kg above baseWeight',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  extraFeePerKg?: number;

  @ApiPropertyOptional({
    example: 5000000,
    nullable: true,
    type: Number,
    description:
      'Orders with subtotal >= this value ship free. Send null to disable.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShipMinOrder?: number | null;

  @ApiPropertyOptional({ example: 1, nullable: true, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDaysMin?: number | null;

  @ApiPropertyOptional({ example: 3, nullable: true, type: Number })
  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedDaysMax?: number | null;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
