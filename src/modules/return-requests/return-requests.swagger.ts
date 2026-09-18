import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiOkResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { applyDecorators } from '@nestjs/common';

import { ReturnRequestResponseDto } from './dto/return-request-response.dto';
import { PaginatedReturnRequestsResponseDto } from './dto/paginated-return-requests-response.dto';

export function ApiListReturnRequests() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List return requests',
      description:
        'Admin: lists all return requests. Customer: lists only their own return requests.',
    }),
    ApiOkResponse({ type: PaginatedReturnRequestsResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
  );
}

export function ApiCreateReturnRequest() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create a return request',
      description:
        'Customer requests a return/refund for one or more items of a delivered order they own.',
    }),
    ApiCreatedResponse({ type: ReturnRequestResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiBadRequestResponse({
      description:
        'Order not eligible for return, or quantity exceeds what was purchased',
    }),
    ApiNotFoundResponse({ description: 'Order or order item not found' }),
  );
}

export function ApiGetReturnRequestById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get return request by id' }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Not the owner of this return request',
    }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}

export function ApiAddReturnRequestImages() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Add evidence images to a return request',
      description: 'Only allowed while the request status is PENDING.',
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: { type: 'string', format: 'binary' },
          },
        },
      },
    }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiBadRequestResponse({ description: 'Request is no longer editable' }),
    ApiForbiddenResponse({
      description: 'Not the owner of this return request',
    }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}

export function ApiCancelReturnRequest() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Cancel a pending return request',
      description:
        'Customer cancels their own request before it is reviewed by admin.',
    }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiBadRequestResponse({
      description: 'Only pending requests can be cancelled',
    }),
    ApiForbiddenResponse({
      description: 'Not the owner of this return request',
    }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}

export function ApiApproveReturnRequest() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Approve a return request (admin)' }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiConflictResponse({ description: 'Request is not pending review' }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}

export function ApiRejectReturnRequest() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Reject a return request (admin)' }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiConflictResponse({ description: 'Request is not pending review' }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}

export function ApiMarkItemReceived() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Mark returned item(s) as received (admin)',
      description:
        'Confirms the warehouse has physically received the returned goods.',
    }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiConflictResponse({ description: 'Request is not approved yet' }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}

export function ApiProcessRefund() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Process the refund for a return request (admin)',
      description:
        'Marks the request as refunded and updates the linked payment status accordingly. Requires a proof-of-transfer image.',
    }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['refundMethod'],
        properties: {
          refundMethod: {
            type: 'string',
            enum: ['BANK_TRANSFER', 'ORIGINAL_PAYMENT_METHOD'],
          },
          refundBankName: { type: 'string', example: 'Vietcombank' },
          refundBankAccountNumber: { type: 'string', example: '0123456789' },
          refundBankAccountHolder: { type: 'string', example: 'NGUYEN VAN A' },
          proofImage: {
            type: 'string',
            format: 'binary',
            description:
              'Ảnh chứng minh đã chuyển tiền (bắt buộc nếu refundMethod = BANK_TRANSFER)',
          },
        },
      },
    }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiBadRequestResponse({
      description: 'Missing proof image (REFUND_PROOF_REQUIRED)',
    }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiConflictResponse({ description: 'Item has not been received yet' }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}

export function ApiCompleteReturnRequest() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Mark a return request as completed (admin)' }),
    ApiOkResponse({ type: ReturnRequestResponseDto }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiConflictResponse({ description: 'Refund has not been processed yet' }),
    ApiNotFoundResponse({ description: 'Return request not found' }),
  );
}
