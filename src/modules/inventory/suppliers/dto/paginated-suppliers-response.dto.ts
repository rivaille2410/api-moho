import { ApiProperty } from '@nestjs/swagger';

import { SupplierResponseDto } from './supplier-response.dto';
import { PageMetaDto } from '@/modules/inventory/common/page-meta.dto';

export class PaginatedSuppliersResponseDto {
  @ApiProperty({ type: [SupplierResponseDto] })
  data: SupplierResponseDto[];

  @ApiProperty({ type: PageMetaDto })
  meta: PageMetaDto;
}
