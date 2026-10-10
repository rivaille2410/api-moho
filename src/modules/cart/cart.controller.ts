import {
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Controller,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@/common/decorators';
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

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiGetCart()
  async getCart(@CurrentUser('id') userId: string) {
    const cart = await this.cartService.getCart(userId);
    return new CartResponseDto(cart);
  }

  @Post('items')
  @ApiAddCartItem()
  async addItem(@CurrentUser('id') userId: string, @Body() dto: AddToCartDto) {
    const cart = await this.cartService.addItem(userId, dto);
    return new CartResponseDto(cart);
  }

  @Patch('items/:id')
  @ApiUpdateCartItem()
  async updateItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    const cart = await this.cartService.updateItem(userId, id, dto);
    return new CartResponseDto(cart);
  }

  @Delete('items/:id')
  @ApiRemoveCartItem()
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const cart = await this.cartService.removeItem(userId, id);
    return new CartResponseDto(cart);
  }

  @Delete()
  @ApiClearCart()
  async clear(@CurrentUser('id') userId: string) {
    const cart = await this.cartService.clear(userId);
    return new CartResponseDto(cart);
  }
}
