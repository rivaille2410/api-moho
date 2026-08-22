import {
  Min,
  Max,
  IsInt,
  IsEnum,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum ReviewSort {
  NEWEST = 'newest',
  OLDEST = 'oldest',
}

export class QueryPublicReviewsDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiPropertyOptional({
    description: 'Only return reviews that include images',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasImages?: boolean;

  @ApiPropertyOptional({ enum: ReviewSort, default: ReviewSort.NEWEST })
  @IsOptional()
  @IsEnum(ReviewSort)
  sort?: ReviewSort = ReviewSort.NEWEST;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}
