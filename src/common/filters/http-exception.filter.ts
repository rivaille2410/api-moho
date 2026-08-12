import {
  Catch,
  HttpStatus,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const isObjectResponse = typeof exceptionResponse === 'object';

    const message = isObjectResponse
      ? (exceptionResponse as Record<string, unknown>).message
      : exceptionResponse;

    const code = isObjectResponse
      ? (exceptionResponse as Record<string, unknown>).code
      : undefined;

    response.status(status).json({
      statusCode: status,
      ...(code ? { code } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
      message,
    });
  }
}
