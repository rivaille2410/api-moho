import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class BulkDeleteProductsDto {
  @ApiProperty({
    type: [String],
    example: [
      'c1a2b3c4-5678-90ab-cdef-1234567890ab',
      'd2b3c4d5-6789-01bc-def0-2345678901bc',
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  ids: string[];
}
