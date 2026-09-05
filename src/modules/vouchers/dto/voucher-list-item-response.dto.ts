import { ApiProperty } from '@nestjs/swagger';
import { VoucherType, VoucherScope, VoucherStatus } from '@prisma/client';

export class VoucherListItemResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ enum: VoucherType })
  type: VoucherType;

  @ApiProperty()
  value: number;

  @ApiProperty({ enum: VoucherScope })
  scope: VoucherScope;

  @ApiProperty()
  usedCount: number;

  @ApiProperty({ required: false, nullable: true })
  usageLimit: number | null;

  @ApiProperty()
  startAt: Date;

  @ApiProperty()
  endAt: Date;

  @ApiProperty({ enum: VoucherStatus })
  effectiveStatus: VoucherStatus;

  @ApiProperty()
  createdAt: Date;

  constructor(voucher: any, effectiveStatus: VoucherStatus) {
    this.id = voucher.id;
    this.code = voucher.code;
    this.name = voucher.name;
    this.type = voucher.type;
    this.value = Number(voucher.value);
    this.scope = voucher.scope;
    this.usedCount = voucher.usedCount;
    this.usageLimit = voucher.usageLimit;
    this.startAt = voucher.startAt;
    this.endAt = voucher.endAt;
    this.effectiveStatus = effectiveStatus;
    this.createdAt = voucher.createdAt;
  }
}
