import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '@/common/dto';
import { PurchaseOrderResponseDto } from './purchase-order-response.dto';

export class PaginatedPurchaseOrdersResponseDto {
  @ApiProperty({ type: [PurchaseOrderResponseDto] })
  data: PurchaseOrderResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
