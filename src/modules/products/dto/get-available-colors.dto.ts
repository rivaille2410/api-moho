import { IsUUID, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetAvailableColorsDto {
  @ApiPropertyOptional({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;
}
