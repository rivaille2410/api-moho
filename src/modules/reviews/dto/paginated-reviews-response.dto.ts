import { ApiProperty } from '@nestjs/swagger';
import { ReviewResponseDto } from './review-response.dto';

class PaginationMetaDto {
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalItems: number;
  @ApiProperty() totalPages: number;
  @ApiProperty() hasNextPage: boolean;
  @ApiProperty() hasPreviousPage: boolean;
}

export class PaginatedReviewsResponseDto {
  @ApiProperty({ type: [ReviewResponseDto] })
  data: ReviewResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class ReviewRatingSummaryDto {
  @ApiProperty() average: number;
  @ApiProperty() total: number;
  @ApiProperty({
    description: 'Number of reviews per star rating, keyed 1..5',
    example: { '1': 0, '2': 1, '3': 2, '4': 10, '5': 87 },
  })
  breakdown: Record<'1' | '2' | '3' | '4' | '5', number>;
}
