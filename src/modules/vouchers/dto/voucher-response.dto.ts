import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VoucherType, VoucherScope, VoucherStatus } from '@prisma/client';

export class VoucherResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string | null;

  @ApiProperty({ enum: VoucherType })
  type: VoucherType;

  @ApiProperty()
  value: number;

  @ApiPropertyOptional()
  maxDiscount?: number | null;

  @ApiProperty()
  minOrderValue: number;

  @ApiProperty({ enum: VoucherScope })
  scope: VoucherScope;

  @ApiProperty({ type: [String] })
  categoryIds: string[];

  @ApiProperty({ type: [String] })
  productIds: string[];

  @ApiPropertyOptional()
  usageLimit?: number | null;

  @ApiProperty()
  usageLimitPerUser: number;

  @ApiProperty()
  usedCount: number;

  @ApiProperty()
  startAt: Date;

  @ApiProperty()
  endAt: Date;

  @ApiProperty({ enum: VoucherStatus })
  status: VoucherStatus;

  @ApiProperty({
    enum: VoucherStatus,
    description: 'Computed status considering current time and usage count',
  })
  effectiveStatus: VoucherStatus;

  @ApiProperty()
  isPublic: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  constructor(voucher: any, effectiveStatus: VoucherStatus) {
    this.id = voucher.id;
    this.code = voucher.code;
    this.name = voucher.name;
    this.description = voucher.description;
    this.type = voucher.type;
    this.value = Number(voucher.value);
    this.maxDiscount = voucher.maxDiscount ? Number(voucher.maxDiscount) : null;
    this.minOrderValue = Number(voucher.minOrderValue);
    this.scope = voucher.scope;
    this.categoryIds = voucher.categories?.map((c: any) => c.categoryId) ?? [];
    this.productIds = voucher.products?.map((p: any) => p.productId) ?? [];
    this.usageLimit = voucher.usageLimit;
    this.usageLimitPerUser = voucher.usageLimitPerUser;
    this.usedCount = voucher.usedCount;
    this.startAt = voucher.startAt;
    this.endAt = voucher.endAt;
    this.status = voucher.status;
    this.effectiveStatus = effectiveStatus;
    this.isPublic = voucher.isPublic;
    this.createdAt = voucher.createdAt;
    this.updatedAt = voucher.updatedAt;
  }
}
