import { ApiProperty } from '@nestjs/swagger';

import { PageMetaDto } from '@/modules/inventory/common/page-meta.dto';
import { StockMovementResponseDto } from './stock-movement-response.dto';

export class PaginatedStockMovementsResponseDto {
  @ApiProperty({ type: [StockMovementResponseDto] })
  data: StockMovementResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;
}
