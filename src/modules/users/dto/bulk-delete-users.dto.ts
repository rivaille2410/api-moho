import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteUsersDto {
  @ApiProperty({
    type: [String],
    example: [
      'b3f1a2c4-5d6e-4f7a-8b9c-0d1e2f3a4b5c',
      'c4f2b3d5-6e7f-4a8b-9c0d-1e2f3a4b5c6d',
    ],
    description: 'List of user IDs to delete',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids: string[];
}
