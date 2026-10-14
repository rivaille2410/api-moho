import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelMyOrderDto {
  @ApiPropertyOptional({ example: 'I placed the order by mistake' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
