import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class GetProductSlugsDto {
  @ApiProperty({
    description: 'Comma-separated list of product UUIDs',
    example: 'a1b2c3d4-...,e5f6g7h8-...',
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
      : value,
  )
  @IsArray()
  @IsUUID('4', { each: true })
  ids: string[];
}
