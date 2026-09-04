import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class QueryPublicCategoriesDto {
  @ApiPropertyOptional({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Only take the root category (no parent)',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  rootOnly?: boolean;
}
