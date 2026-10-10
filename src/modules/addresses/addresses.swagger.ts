import {
  ApiParam,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { AddressResponseDto } from './dto/address-response.dto';

const Auth = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
  );

export const ApiListMyAddresses = () =>
  applyDecorators(
    Auth(),
    ApiOperation({
      summary: 'List addresses of the current user',
      description:
        'Sorted with the default address first, then by most recently updated.',
    }),
    ApiOkResponse({ type: [AddressResponseDto] }),
  );

export const ApiGetMyAddressById = () =>
  applyDecorators(
    Auth(),
    ApiOperation({ summary: "Get one of the current user's addresses" }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: AddressResponseDto }),
    ApiNotFoundResponse({ description: 'Address not found' }),
  );

export const ApiCreateAddress = () =>
  applyDecorators(
    Auth(),
    ApiOperation({
      summary: 'Create a new address',
      description:
        'The first address of a user is always stored as the default one. Limited to 10 addresses per user.',
    }),
    ApiCreatedResponse({ type: AddressResponseDto }),
    ApiConflictResponse({ description: 'Address limit reached' }),
  );

export const ApiUpdateAddress = () =>
  applyDecorators(
    Auth(),
    ApiOperation({ summary: 'Update an address' }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: AddressResponseDto }),
    ApiBadRequestResponse({
      description: 'Cannot unset the default address directly',
    }),
    ApiNotFoundResponse({ description: 'Address not found' }),
  );

export const ApiSetDefaultAddress = () =>
  applyDecorators(
    Auth(),
    ApiOperation({
      summary: 'Set an address as default',
      description:
        'Unsets the previous default address of the user in the same transaction.',
    }),
    ApiParam({ name: 'id' }),
    ApiOkResponse({ type: AddressResponseDto }),
    ApiNotFoundResponse({ description: 'Address not found' }),
  );

export const ApiDeleteAddress = () =>
  applyDecorators(
    Auth(),
    ApiOperation({
      summary: 'Delete an address',
      description:
        'Existing orders keep their shipping address snapshot; their addressId is set to null.',
    }),
    ApiParam({ name: 'id' }),
    ApiNoContentResponse({ description: 'Address deleted' }),
    ApiNotFoundResponse({ description: 'Address not found' }),
  );
