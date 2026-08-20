import {
  IsUUID,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Tables', maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab',
    description: 'Parent category id. Omit to create a root category.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
