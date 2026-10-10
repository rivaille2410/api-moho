import {
  Catch,
  HttpStatus,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

const PRISMA_STATUS: Record<string, number> = {
  P2002: HttpStatus.CONFLICT,
  P2003: HttpStatus.BAD_REQUEST,
  P2025: HttpStatus.NOT_FOUND,
};

const PRISMA_MESSAGE: Record<string, string> = {
  P2002: 'A record with this unique value already exists',
  P2003: 'Related record does not exist',
  P2025: 'Record not found',
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      PRISMA_STATUS[exception.code] ?? HttpStatus.INTERNAL_SERVER_ERROR;

    response.status(status).json({
      statusCode: status,
      code: exception.code,
      path: request.url,
      timestamp: new Date().toISOString(),
      message: PRISMA_MESSAGE[exception.code] ?? 'Database request failed',
    });
  }
}
