import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export type DashboardRange = '7d' | '30d' | '90d';
const RANGES: DashboardRange[] = ['7d', '30d', '90d'];

export class DashboardStatsQueryDto {
  @ApiPropertyOptional({ enum: RANGES, default: '30d' })
  @IsOptional()
  @IsIn(RANGES)
  range: DashboardRange = '30d';
}

export class RevenueChartQueryDto {
  @ApiPropertyOptional({ enum: RANGES, default: '30d' })
  @IsOptional()
  @IsIn(RANGES)
  range: DashboardRange = '30d';
}

export class TopProductsQueryDto {
  @ApiPropertyOptional({ default: 5, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 5;
}

export class LowStockQueryDto {
  @ApiPropertyOptional({ default: 5, minimum: 0, maximum: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  threshold: number = 5;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}

export class RecentOrdersQueryDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}

export class TopCustomersQueryDto extends DashboardStatsQueryDto {
  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 10;
}
