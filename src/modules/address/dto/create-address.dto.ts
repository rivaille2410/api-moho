import {
  Min,
  IsInt,
  Matches,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  recipientName: string;

  @ApiProperty({ example: '0901234567' })
  @IsString()
  @Matches(/^(0|\+84)(3|5|7|8|9)\d{8}$/, {
    message: 'recipientPhone must be a valid Vietnamese phone number',
  })
  recipientPhone: string;

  @ApiProperty({ example: 79 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  provinceCode: number;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  @IsString()
  @MaxLength(100)
  provinceName: string;

  @ApiProperty({ example: 26734 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  wardCode: number;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  @IsString()
  @MaxLength(100)
  wardName: string;

  @ApiProperty({ example: '123 Lê Lợi, toà nhà ABC, tầng 5' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  addressDetail: string;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'Set this address as the default one. The first address of a user is always default.',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
