import { Address } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

import { formatAddressText } from '../addresses.util';

export class AddressResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  recipientName: string;

  @ApiProperty({ example: '0901234567' })
  recipientPhone: string;

  @ApiProperty({ example: 79 })
  provinceCode: number;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  provinceName: string;

  @ApiProperty({ example: 26734 })
  wardCode: number;

  @ApiProperty({ example: 'Phường Bến Nghé' })
  wardName: string;

  @ApiProperty({ example: '123 Lê Lợi, toà nhà ABC, tầng 5' })
  addressDetail: string;

  @ApiProperty({
    example:
      '123 Lê Lợi, toà nhà ABC, tầng 5, Phường Bến Nghé, Thành phố Hồ Chí Minh',
    description: 'Full address text, ready to render or snapshot into an order',
  })
  fullAddress: string;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(address: Address) {
    this.id = address.id;
    this.recipientName = address.recipientName;
    this.recipientPhone = address.recipientPhone;
    this.provinceCode = address.provinceCode;
    this.provinceName = address.provinceName;
    this.wardCode = address.wardCode;
    this.wardName = address.wardName;
    this.addressDetail = address.addressDetail;
    this.fullAddress = formatAddressText(address);
    this.isDefault = address.isDefault;
    this.createdAt = address.createdAt;
    this.updatedAt = address.updatedAt;
  }
}
