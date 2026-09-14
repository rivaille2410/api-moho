import { Warehouse } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WarehouseResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() provinceCode?: number | null;
  @ApiPropertyOptional() provinceName?: string | null;
  @ApiPropertyOptional() wardCode?: number | null;
  @ApiPropertyOptional() wardName?: string | null;
  @ApiPropertyOptional() addressDetail?: string | null;
  @ApiProperty() isMain: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;

  constructor(warehouse: Warehouse) {
    this.id = warehouse.id;
    this.name = warehouse.name;
    this.provinceCode = warehouse.provinceCode;
    this.provinceName = warehouse.provinceName;
    this.wardCode = warehouse.wardCode;
    this.wardName = warehouse.wardName;
    this.addressDetail = warehouse.addressDetail;
    this.isMain = warehouse.isMain;
    this.createdAt = warehouse.createdAt;
    this.updatedAt = warehouse.updatedAt;
  }
}
