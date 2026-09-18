import { ApiProperty } from '@nestjs/swagger';
import { ReturnRequestResponseDto } from './return-request-response.dto';

class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalItems: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedReturnRequestsResponseDto {
  @ApiProperty({ type: [ReturnRequestResponseDto] })
  data: ReturnRequestResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}
