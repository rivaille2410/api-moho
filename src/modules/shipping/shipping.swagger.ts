import {
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { ShipmentResponseDto } from './dto/shipment-response.dto';
import { ShippingZoneResponseDto } from './dto/shipping-zone-response.dto';
import { ShippingFeeResponseDto } from './dto/calculate-shipping-fee.dto';
import { PaginatedShipmentsResponseDto } from './dto/paginated-shipments-response.dto';
import { PaginatedShippingZonesResponseDto } from './dto/paginated-shipping-zones-response.dto';

function ApiAdminAuth() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiListShippingZones() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'List shipping zones',
      description:
        'Retrieve a paginated list of shipping zones with their provinces. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedShippingZonesResponseDto }),
  );
}

export function ApiCreateShippingZone() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Create shipping zone',
      description:
        'Create a zone that groups provinces sharing the same fee table. A province can belong to only one zone. Requires admin role.',
    }),
    ApiCreatedResponse({ type: ShippingZoneResponseDto }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({
      description: 'A province already belongs to another zone',
    }),
  );
}

export function ApiGetShippingZoneById() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Get shipping zone by id',
      description: 'Retrieve a single shipping zone. Requires admin role.',
    }),
    ApiOkResponse({ type: ShippingZoneResponseDto }),
    ApiNotFoundResponse({ description: 'Shipping zone not found' }),
  );
}

export function ApiUpdateShippingZone() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Update shipping zone',
      description:
        'Update fee settings. When `provinces` is sent, the zone province list is replaced. Requires admin role.',
    }),
    ApiOkResponse({ type: ShippingZoneResponseDto }),
    ApiBadRequestResponse({ description: 'Validation failed' }),
    ApiConflictResponse({
      description: 'A province already belongs to another zone',
    }),
    ApiNotFoundResponse({ description: 'Shipping zone not found' }),
  );
}

export function ApiDeleteShippingZone() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Delete shipping zone',
      description:
        'Soft-delete a zone and release its provinces so they can be assigned to another zone. Requires admin role.',
    }),
    ApiNoContentResponse({ description: 'Shipping zone deleted successfully' }),
    ApiNotFoundResponse({ description: 'Shipping zone not found' }),
  );
}

export function ApiCalculateShippingFee() {
  return applyDecorators(
    ApiOperation({
      summary: 'Calculate shipping fee',
      description:
        'Calculate the shipping fee for a destination province and a list of variants. Subtotal and chargeable weight are computed server-side. No authentication required.',
    }),
    ApiOkResponse({ type: ShippingFeeResponseDto }),
    ApiBadRequestResponse({
      description: 'Validation failed, or an item is unavailable',
    }),
    ApiUnprocessableEntityResponse({
      description: 'No active shipping zone covers this province',
    }),
  );
}

export function ApiListShipments() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'List shipments',
      description:
        'Retrieve a paginated list of shipments. Use `orderId` to list the shipments of one order. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedShipmentsResponseDto }),
  );
}

export function ApiCreateShipment() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Create shipment',
      description:
        'Create a manual shipment for an order (CONFIRMED / PROCESSING / SHIPPED). Omit `items` to ship everything not yet assigned; send `items` to split the order into several shipments. Requires admin role.',
    }),
    ApiCreatedResponse({ type: ShipmentResponseDto }),
    ApiBadRequestResponse({
      description:
        'Validation failed, order not shippable, or item quantity exceeds what is left to ship',
    }),
    ApiNotFoundResponse({ description: 'Order not found' }),
  );
}

export function ApiGetShipmentById() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Get shipment by id',
      description: 'Retrieve a single shipment. Requires admin role.',
    }),
    ApiOkResponse({ type: ShipmentResponseDto }),
    ApiNotFoundResponse({ description: 'Shipment not found' }),
  );
}

export function ApiUpdateShipment() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Update shipment info',
      description:
        'Edit carrier, tracking code, driver, vehicle, schedule and note. Not allowed once the shipment is DELIVERED or CANCELLED. Requires admin role.',
    }),
    ApiOkResponse({ type: ShipmentResponseDto }),
    ApiBadRequestResponse({
      description: 'Validation failed or shipment locked',
    }),
    ApiNotFoundResponse({ description: 'Shipment not found' }),
  );
}

export function ApiUpdateShipmentStatus() {
  return applyDecorators(
    ApiAdminAuth(),
    ApiOperation({
      summary: 'Update shipment status',
      description:
        'Allowed transitions: PREPARING → IN_TRANSIT | CANCELLED, IN_TRANSIT → DELIVERED | FAILED, FAILED → IN_TRANSIT | CANCELLED. Also syncs the order status (SHIPPED / DELIVERED) and, when `collectedAmount` is sent with DELIVERED, records the COD collection. Requires admin role.',
    }),
    ApiOkResponse({ type: ShipmentResponseDto }),
    ApiBadRequestResponse({
      description:
        'Invalid transition, missing failedReason, or COD collection not possible',
    }),
    ApiNotFoundResponse({ description: 'Shipment not found' }),
  );
}
