import { RefundMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateIf } from 'class-validator';

export class ProcessRefundDto {
  @ApiProperty({ enum: RefundMethod })
  @IsEnum(RefundMethod)
  refundMethod: RefundMethod;

  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.refundMethod === RefundMethod.BANK_TRANSFER)
  @IsString()
  refundBankName?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.refundMethod === RefundMethod.BANK_TRANSFER)
  @IsString()
  refundBankAccountNumber?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto) => dto.refundMethod === RefundMethod.BANK_TRANSFER)
  @IsString()
  refundBankAccountHolder?: string;
}
