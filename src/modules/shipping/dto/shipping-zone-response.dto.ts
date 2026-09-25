import { ApiProperty } from '@nestjs/swagger';

import { ShippingZoneWithProvinces } from '../shipping.constants';

export class ShippingZoneProvinceResponseDto {
  @ApiProperty({ example: 79 })
  provinceCode: number;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  provinceName: string;
}

export class ShippingZoneResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Nội thành TP.HCM' })
  name: string;

  @ApiProperty({ type: [ShippingZoneProvinceResponseDto] })
  provinces: ShippingZoneProvinceResponseDto[];

  @ApiProperty({ example: 150000 })
  baseFee: number;

  @ApiProperty({ example: 30 })
  baseWeight: number;

  @ApiProperty({ example: 5000 })
  extraFeePerKg: number;

  @ApiProperty({ type: Number, nullable: true, example: 5000000 })
  freeShipMinOrder: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 1 })
  estimatedDaysMin: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3 })
  estimatedDaysMax: number | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 0 })
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(zone: ShippingZoneWithProvinces) {
    this.id = zone.id;
    this.name = zone.name;
    this.provinces = zone.provinces.map((p) => ({
      provinceCode: p.provinceCode,
      provinceName: p.provinceName,
    }));
    this.baseFee = Number(zone.baseFee);
    this.baseWeight = Number(zone.baseWeight);
    this.extraFeePerKg = Number(zone.extraFeePerKg);
    this.freeShipMinOrder =
      zone.freeShipMinOrder !== null ? Number(zone.freeShipMinOrder) : null;
    this.estimatedDaysMin = zone.estimatedDaysMin;
    this.estimatedDaysMax = zone.estimatedDaysMax;
    this.isActive = zone.isActive;
    this.sortOrder = zone.sortOrder;
    this.createdAt = zone.createdAt;
    this.updatedAt = zone.updatedAt;
  }
}
