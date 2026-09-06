import {
  Get,
  Req,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AddToCartDto } from './dto/add-to-cart.dto';
import { CartResponseDto } from './dto/cart-response.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

import {
  ApiGetCart,
  ApiClearCart,
  ApiAddCartItem,
  ApiRemoveCartItem,
  ApiUpdateCartItem,
} from './cart.swagger';
import { CartService } from './cart.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';

@ApiTags('Cart')
@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiGetCart()
  async getCart(@Req() req: { user: { id: string } }) {
    const cart = await this.cartService.getCart(req.user.id);
    return new CartResponseDto(cart);
  }

  @Post('items')
  @ApiAddCartItem()
  async addItem(
    @Req() req: { user: { id: string } },
    @Body() dto: AddToCartDto,
  ) {
    const cart = await this.cartService.addItem(req.user.id, dto);
    return new CartResponseDto(cart);
  }

  @Patch('items/:id')
  @ApiUpdateCartItem()
  async updateItem(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateItem(req.user.id, id, dto);
    return new CartResponseDto(cart);
  }

  @Delete('items/:id')
  @ApiRemoveCartItem()
  async removeItem(
    @Req() req: { user: { id: string } },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const cart = await this.cartService.removeItem(req.user.id, id);
    return new CartResponseDto(cart);
  }

  @Delete()
  @ApiClearCart()
  async clear(@Req() req: { user: { id: string } }) {
    const cart = await this.cartService.clear(req.user.id);
    return new CartResponseDto(cart);
  }
}
