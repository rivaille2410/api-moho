import {
  IsInt,
  IsString,
  IsBoolean,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWarehouseDto {
  @ApiProperty({ example: 'Binh Duong Warehouse' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  provinceCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  wardCode?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  wardName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isMain?: boolean;
}
