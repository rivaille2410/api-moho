import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryCategoriesDto {
  @ApiPropertyOptional({ example: 'table' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'Filter by parent category',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Only return root categories (parentId = null)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  rootOnly?: boolean;
}
