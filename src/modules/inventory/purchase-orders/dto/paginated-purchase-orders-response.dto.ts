import { ApiProperty } from '@nestjs/swagger';

import { PageMetaDto } from '@/modules/inventory/common/page-meta.dto';
import { PurchaseOrderResponseDto } from './purchase-order-response.dto';

export class PaginatedPurchaseOrdersResponseDto {
  @ApiProperty({ type: [PurchaseOrderResponseDto] })
  data: PurchaseOrderResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;
}
