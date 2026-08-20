import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class CategoryTreeNodeDto {
  @Expose()
  @ApiProperty({ example: 'b1e2c3d4-5678-90ab-cdef-1234567890ab' })
  id: string;

  @Expose()
  @ApiProperty({ example: 'Tables' })
  name: string;

  @Expose()
  @ApiProperty({ example: 'tables' })
  slug: string;

  @Expose()
  @ApiProperty({ type: () => [CategoryTreeNodeDto] })
  @Type(() => CategoryTreeNodeDto)
  children: CategoryTreeNodeDto[];

  constructor(node: {
    id: string;
    name: string;
    slug: string;
    children: CategoryTreeNodeDto[];
  }) {
    Object.assign(this, node);
  }
}
