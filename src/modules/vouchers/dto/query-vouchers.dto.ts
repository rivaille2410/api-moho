import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherStatus, VoucherScope } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class QueryVouchersDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by code or name' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VoucherStatus })
  @IsOptional()
  @IsEnum(VoucherStatus)
  status?: VoucherStatus;

  @ApiPropertyOptional({ enum: VoucherScope })
  @IsOptional()
  @IsEnum(VoucherScope)
  scope?: VoucherScope;
}
