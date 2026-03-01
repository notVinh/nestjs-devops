import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    // Get error response details
    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Extract more details from error response
    let errorMessage: string;
    if (typeof errorResponse === 'string') {
      errorMessage = errorResponse;
    } else if ((errorResponse as any).message) {
      errorMessage = (errorResponse as any).message;
    } else if ((errorResponse as any).errors?.message) {
      // Handle error format from error.helper.ts: { statusCode, errors: { message } }
      errorMessage = (errorResponse as any).errors.message;
    } else {
      errorMessage = message;
    }

    let errorDetails: any =
      typeof errorResponse === 'object' && errorResponse !== null
        ? errorResponse
        : { message: errorMessage };

    // KHÔNG tự động thêm message nữa - để error.helper.ts format nguyên gốc

    // Log error với Winston
    const logContext = {
      context: 'HttpExceptionFilter',
      method: request.method,
      url: request.url,
      statusCode: status,
      ip: request.ip,
      userAgent: request.get('user-agent'),
    };

    if (status >= 500) {
      // Server errors - log với trace
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${errorMessage}`,
        {
          ...logContext,
          trace: exception instanceof Error ? exception.stack : undefined,
          error: exception,
        },
      );
    } else if (status >= 400) {
      // Client errors - log warning
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${errorMessage}`,
        logContext,
      );
    }

    // Return formatted error response
    response.status(status).json({
      statusCode: status,
      // timestamp: new Date().toISOString(),
      // path: request.url,
      // method: request.method,
      ...errorDetails,
    });
  }
}
