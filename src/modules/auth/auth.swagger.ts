import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

import { AuthResponseDto } from './dto/auth-response.dto';

export const ApiRegister = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new account',
      description:
        'Creates a new user account and returns an access token and refresh token.',
    }),
    ApiResponse({
      status: 201,
      description: 'Account created successfully.',
      type: AuthResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed (invalid email, weak password, etc.).',
    }),
    ApiResponse({
      status: 409,
      description: 'Email is already in use.',
    }),
  );

export const ApiRegisterAdmin = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Register a new admin account',
      description:
        'Creates a new user account with an elevated role (defaults to ADMIN). Only accessible by an authenticated admin.',
    }),
    ApiResponse({
      status: 201,
      description: 'Admin account created successfully.',
      schema: {
        example: {
          id: 'clx1234567890',
          name: 'Nguyen Van A',
          email: 'admin@example.com',
          role: 'ADMIN',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed (invalid email, weak password, etc.).',
    }),
    ApiResponse({
      status: 401,
      description: 'Access token is missing, invalid, or expired.',
    }),
    ApiResponse({
      status: 403,
      description:
        'Current user does not have permission to perform this action.',
    }),
    ApiResponse({
      status: 409,
      description: 'Email is already in use.',
    }),
  );

export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Log in',
      description:
        'Authenticates a user with email and password, returning an access token and refresh token.',
    }),
    ApiResponse({
      status: 200,
      description: 'Login successful.',
      type: AuthResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed (missing or malformed fields).',
    }),
    ApiResponse({
      status: 401,
      description: 'Incorrect email or password.',
    }),
  );

export const ApiGoogleAuth = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Log in with Google',
      description: 'Redirects the user to the Google OAuth consent screen.',
    }),
    ApiResponse({
      status: 302,
      description: 'Redirect to Google consent screen.',
    }),
  );

export const ApiGoogleCallback = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Google OAuth callback',
      description:
        'Handles the redirect from Google after consent, then redirects to the frontend with tokens as query params.',
    }),
    ApiResponse({
      status: 302,
      description:
        'Redirect to frontend with accessToken and refreshToken as query params.',
    }),
    ApiResponse({
      status: 401,
      description: 'Google authentication failed.',
    }),
  );

export const ApiRefresh = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Issues a new access token and refresh token using a valid refresh token. The previous refresh token is revoked (rotation).',
    }),
    ApiResponse({
      status: 200,
      description: 'Token refreshed successfully.',
      type: AuthResponseDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Refresh token is invalid, expired, or has been revoked.',
    }),
  );

export const ApiLogout = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Log out',
      description: 'Revokes the given refresh token, ending the session.',
    }),
    ApiResponse({
      status: 200,
      description: 'Logout successful.',
      schema: {
        example: {
          message: 'Logged out successfully',
        },
      },
    }),
    ApiResponse({
      status: 401,
      description: 'Refresh token is invalid or expired.',
    }),
  );

export const ApiVerifyEmail = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Verify email',
      description:
        "Verifies a user's email address using the token from the verification link, then returns an access token and refresh token.",
    }),
    ApiResponse({
      status: 200,
      description: 'Email verified successfully.',
      type: AuthResponseDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Verification token is missing or malformed.',
    }),
    ApiResponse({
      status: 401,
      description: 'Verification link is invalid or has expired.',
    }),
  );

export const ApiResendVerification = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Resend verification email',
      description:
        'Sends a new verification link to the given email if an unverified account exists for it. Always returns a generic message to avoid revealing whether the account exists.',
    }),
    ApiResponse({
      status: 200,
      description: 'Request processed.',
      schema: {
        example: {
          message:
            'If an account with that email exists and is unverified, a new verification link has been sent.',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid email address.',
    }),
  );

export const ApiForgotPassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Forgot password',
      description:
        'Sends a password reset link to the provided email address. Returns a generic response to prevent account enumeration.',
    }),
    ApiResponse({
      status: 200,
      description: 'Password reset request processed.',
      schema: {
        example: {
          message:
            'If an account with that email exists, a password reset link has been sent.',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Invalid email address.',
    }),
  );

export const ApiResetPassword = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Reset password',
      description:
        'Resets the user password using a valid password reset token.',
    }),
    ApiResponse({
      status: 200,
      description: 'Password reset successfully.',
      schema: {
        example: {
          message: 'Password reset successfully.',
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Validation failed or password does not meet requirements.',
    }),
    ApiResponse({
      status: 401,
      description: 'Password reset token is invalid or has expired.',
    }),
  );

export const ApiMe = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get current user',
      description:
        'Returns the authenticated user extracted from the access token.',
    }),
    ApiResponse({
      status: 200,
      description: 'Current user information retrieved successfully.',
    }),
    ApiResponse({
      status: 401,
      description: 'Access token is missing, invalid, or expired.',
    }),
  );
