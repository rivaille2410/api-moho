import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '@/common/dto';
import { ReturnRequestResponseDto } from './return-request-response.dto';

export class PaginatedReturnRequestsResponseDto {
  @ApiProperty({ type: [ReturnRequestResponseDto] })
  data: ReturnRequestResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
