import {
  IsInt,
  IsEmail,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Nội Thất Xuân Hòa' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: 'contact@xuanhoa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 79 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  provinceCode?: number;

  @ApiPropertyOptional({ example: 'Thành phố Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  provinceName?: string;

  @ApiPropertyOptional({ example: 27700 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  wardCode?: number;

  @ApiPropertyOptional({ example: 'Phường Bến Nghé' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  wardName?: string;

  @ApiPropertyOptional({ example: 'Số 34 Lũy Bán Bích' })
  @IsOptional()
  @IsString()
  addressDetail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
