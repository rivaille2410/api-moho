import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '@/common/dto';
import { StockMovementResponseDto } from './stock-movement-response.dto';

export class PaginatedStockMovementsResponseDto {
  @ApiProperty({ type: [StockMovementResponseDto] })
  data: StockMovementResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
