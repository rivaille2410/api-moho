import {
  Min,
  Max,
  IsInt,
  IsUUID,
  IsString,
  MaxLength,
  MinLength,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Id of the product being reviewed' })
  @IsUUID()
  productId: string;

  @ApiPropertyOptional({
    description:
      'Link this review to an existing user. Omit for an admin-authored/seed review with no real user attached.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    description:
      "Display name of the reviewer. If userId is provided, this should match the user's name at creation time.",
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  authorName: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ description: 'Variant this review refers to, if any' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiPropertyOptional({ example: 'Used for 13 days' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  usedForLabel?: string;

  @ApiPropertyOptional({
    description: 'Manually mark as verified purchase (admin/seed use only)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  verifiedPurchase?: boolean;
}
