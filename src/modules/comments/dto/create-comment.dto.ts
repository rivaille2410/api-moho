import {
  IsUUID,
  IsString,
  MaxLength,
  MinLength,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ minLength: 1, maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({
    description:
      'Id of the top-level comment being replied to. Omit for a new top-level comment. Replying to a reply is automatically flattened onto its root comment.',
  })
  @IsOptional()
  @IsUUID()
  parentId?: string;
}
