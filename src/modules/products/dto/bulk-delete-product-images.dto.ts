import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteProductImagesDto {
  @ApiProperty({
    type: [String],
    example: ['c1a2b3c4-5678-90ab-cdef-1234567890ab'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  imageIds: string[];
}
