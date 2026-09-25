import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from './pagination-meta.dto';
import { ShipmentResponseDto } from './shipment-response.dto';

export class PaginatedShipmentsResponseDto {
  @ApiProperty({ type: [ShipmentResponseDto] })
  data: ShipmentResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
