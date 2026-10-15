import {
  Catch,
  HttpStatus,
  ArgumentsHost,
  HttpException,
  ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof HttpException)) {
      const error = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(error.message, error.stack);
    }
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
