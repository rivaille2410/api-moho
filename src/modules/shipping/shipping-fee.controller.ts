import { ApiTags } from '@nestjs/swagger';
import { Post, Body, HttpCode, HttpStatus, Controller } from '@nestjs/common';

import { ShippingFeeService } from './shipping-fee.service';
import { ApiCalculateShippingFee } from './shipping.swagger';
import { CalculateShippingFeeDto } from './dto/calculate-shipping-fee.dto';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingFeeController {
  constructor(private readonly shippingFeeService: ShippingFeeService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiCalculateShippingFee()
  calculate(@Body() dto: CalculateShippingFeeDto) {
    return this.shippingFeeService.calculate(dto);
  }
}
