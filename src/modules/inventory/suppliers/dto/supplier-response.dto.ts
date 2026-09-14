import { Supplier } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SupplierResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() contactName?: string | null;
  @ApiPropertyOptional() phone?: string | null;
  @ApiPropertyOptional() email?: string | null;
  @ApiPropertyOptional() provinceCode?: number | null;
  @ApiPropertyOptional() provinceName?: string | null;
  @ApiPropertyOptional() wardCode?: number | null;
  @ApiPropertyOptional() wardName?: string | null;
  @ApiPropertyOptional() addressDetail?: string | null;
  @ApiPropertyOptional() note?: string | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(supplier: Supplier) {
    this.id = supplier.id;
    this.name = supplier.name;
    this.contactName = supplier.contactName;
    this.phone = supplier.phone;
    this.email = supplier.email;
    this.provinceCode = supplier.provinceCode;
    this.provinceName = supplier.provinceName;
    this.wardCode = supplier.wardCode;
    this.wardName = supplier.wardName;
    this.addressDetail = supplier.addressDetail;
    this.note = supplier.note;
    this.createdAt = supplier.createdAt;
    this.updatedAt = supplier.updatedAt;
  }
}
