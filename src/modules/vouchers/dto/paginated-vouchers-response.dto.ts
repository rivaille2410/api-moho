import { ApiProperty } from '@nestjs/swagger';
import { VoucherListItemResponseDto } from './voucher-list-item-response.dto';

class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalItems: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedVouchersResponseDto {
  @ApiProperty({ type: [VoucherListItemResponseDto] })
  data: VoucherListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
