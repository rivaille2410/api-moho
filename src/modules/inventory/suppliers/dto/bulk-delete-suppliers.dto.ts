import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, ArrayUnique, IsUUID } from 'class-validator';

export class BulkDeleteSuppliersDto {
  @ApiProperty({
    type: [String],
    example: [
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      '3fa85f64-5717-4562-b3fc-2c963f66afa7',
    ],
  })
  @IsUUID('4', { each: true })
  @ArrayNotEmpty()
  @ArrayUnique()
  ids: string[];
}
