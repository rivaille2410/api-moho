import { ApiProperty } from '@nestjs/swagger';

export class ProductSlugResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() slug: string;

  constructor(data: { id: string; slug: string }) {
    this.id = data.id;
    this.slug = data.slug;
  }
}
