import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VoucherStatus } from '@prisma/client';

export class UpdateVoucherStatusDto {
  @ApiProperty({ enum: VoucherStatus, example: VoucherStatus.ACTIVE })
  @IsEnum(VoucherStatus)
  status: VoucherStatus;
}
