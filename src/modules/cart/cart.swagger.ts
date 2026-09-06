import {
  ApiParam,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { CartResponseDto } from './dto/cart-response.dto';

export const ApiGetCart = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: "Get the current user's cart" }),
    ApiOkResponse({ type: CartResponseDto }),
  );

export const ApiAddCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Add a variant to the cart' }),
    ApiOkResponse({ type: CartResponseDto }),
  );

export const ApiUpdateCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Update quantity of a cart item' }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: CartResponseDto }),
  );

export const ApiRemoveCartItem = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Remove an item from the cart' }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: CartResponseDto }),
  );

export const ApiClearCart = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Clear all items from the cart' }),
    ApiOkResponse({ type: CartResponseDto }),
  );
