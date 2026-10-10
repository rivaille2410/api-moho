import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '@/common/dto';
import { VoucherListItemResponseDto } from './voucher-list-item-response.dto';

export class PaginatedVouchersResponseDto {
  @ApiProperty({ type: [VoucherListItemResponseDto] })
  data: VoucherListItemResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
