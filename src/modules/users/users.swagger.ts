import {
  ApiBody,
  ApiConsumes,
  ApiResponse,
  ApiProduces,
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

import { UserResponseDto } from './dto/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/paginated-users-response.dto';

export function ApiListUsers() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'List users',
      description: 'Retrieve a paginated list of users. Requires admin role.',
    }),
    ApiOkResponse({ type: PaginatedUsersResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiCreateUser() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Create user',
      description:
        'Create a new user directly (admin only). Skips the email verification flow.',
    }),
    ApiCreatedResponse({ type: UserResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiConflictResponse({ description: 'Email is already in use' }),
  );
}

export function ApiExportUsers() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Export users to Excel',
      description:
        'Export the filtered list of users (search/role/banned/emailVerified) to an .xlsx file. Requires admin role. Not limited by pagination — returns all matching records.',
    }),
    ApiProduces(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ),
    ApiResponse({
      status: 200,
      description: 'Excel file (.xlsx) containing the filtered user list',
      content: {
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
          schema: { type: 'string', format: 'binary' },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
  );
}

export function ApiGetUserById() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get user by id',
      description: 'Retrieve a single user by id. Requires admin role.',
    }),
    ApiOkResponse({ type: UserResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'User not found' }),
  );
}

export function ApiUpdateCurrentUser() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update current user',
      description: "Update the authenticated user's profile information.",
    }),
    ApiOkResponse({ type: UserResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
  );
}

export function ApiChangePassword() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Change password',
      description: "Change the authenticated user's password.",
    }),
    ApiOkResponse({ description: 'Password updated successfully' }),
    ApiUnauthorizedResponse({
      description:
        'Missing/invalid access token, or current password is incorrect',
    }),
    ApiBadRequestResponse({
      description: 'Account has no password set (signed in via Google)',
    }),
  );
}

export function ApiUpdateAvatar() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiConsumes('multipart/form-data'),
    ApiOperation({
      summary: 'Update avatar',
      description:
        "Upload and update the authenticated user's avatar. Stored on Cloudinary.",
    }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
            description: 'Image file (jpg, jpeg, png, webp), max 5MB',
          },
        },
      },
    }),
    ApiOkResponse({ type: UserResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiUnprocessableEntityResponse({
      description: 'Invalid file type or file too large',
    }),
  );
}

export function ApiChangeUserRole() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Change user role',
      description: "Update a user's role. Requires admin role.",
    }),
    ApiOkResponse({ type: UserResponseDto }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description:
        'Only admins can access this resource, or an admin is trying to change their own role',
    }),
    ApiBadRequestResponse({
      description: 'Cannot demote the last remaining admin in the system',
    }),
    ApiNotFoundResponse({ description: 'User not found' }),
  );
}

export const ApiBanUser = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Ban a user',
      description:
        'Bans a user account, revoking all active sessions. Admins cannot be banned, and users cannot ban themselves.',
    }),
    ApiResponse({
      status: 200,
      description: 'User banned successfully.',
      type: UserResponseDto,
    }),
    ApiResponse({ status: 400, description: 'User is already banned.' }),
    ApiResponse({
      status: 403,
      description: 'Cannot ban self or an admin account.',
    }),
    ApiResponse({ status: 404, description: 'User not found.' }),
  );

export const ApiUnbanUser = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Unban a user',
      description: 'Restores a banned user account.',
    }),
    ApiResponse({
      status: 200,
      description: 'User unbanned successfully.',
      type: UserResponseDto,
    }),
    ApiResponse({ status: 400, description: 'User is not banned.' }),
    ApiResponse({ status: 404, description: 'User not found.' }),
  );

export function ApiDeleteUser() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Delete user',
      description: 'Permanently delete a user. Requires admin role.',
    }),
    ApiNoContentResponse({ description: 'User deleted successfully' }),
    ApiUnauthorizedResponse({ description: 'Missing or invalid access token' }),
    ApiForbiddenResponse({
      description: 'Only admins can access this resource',
    }),
    ApiNotFoundResponse({ description: 'User not found' }),
  );
}

export const ApiBulkDeleteUsers = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Bulk delete users',
      description:
        'Soft-deletes multiple user accounts at once. Fails entirely if any ID is invalid, not found, or belongs to an admin, or to the requester themselves.',
    }),
    ApiResponse({
      status: 200,
      description: 'Users deleted successfully.',
      schema: { example: { deletedCount: 3 } },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed (empty or invalid ID list).',
    }),
    ApiResponse({
      status: 403,
      description: 'Cannot delete self or an admin account.',
    }),
    ApiResponse({
      status: 404,
      description: 'One or more user IDs not found.',
    }),
  );
