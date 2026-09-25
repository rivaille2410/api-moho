import { ApiProperty } from '@nestjs/swagger';

import { PaginationMetaDto } from './pagination-meta.dto';
import { ShippingZoneResponseDto } from './shipping-zone-response.dto';

export class PaginatedShippingZonesResponseDto {
  @ApiProperty({ type: [ShippingZoneResponseDto] })
  data: ShippingZoneResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
