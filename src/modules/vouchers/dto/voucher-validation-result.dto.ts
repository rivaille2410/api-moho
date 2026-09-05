import { ApiProperty } from '@nestjs/swagger';

export class VoucherValidationResultDto {
  @ApiProperty()
  voucherId: string;

  @ApiProperty()
  code: string;

  @ApiProperty({
    description: 'Actual discount amount applied, capped by subtotal',
  })
  discountAmount: number;

  constructor(voucherId: string, code: string, discountAmount: number) {
    this.voucherId = voucherId;
    this.code = code;
    this.discountAmount = discountAmount;
  }
}
