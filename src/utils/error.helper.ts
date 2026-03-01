import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Throw một HTTP Exception với format chuẩn
 * @param statusCode - HTTP status code
 * @param message - Thông báo lỗi
 */
export function throwHttpError(
  statusCode: HttpStatus,
  message: string,
): never {
  throw new HttpException(
    {
      statusCode,
      errors: {
        message,
      },
    },
    statusCode,
  );
}

/**
 * Throw lỗi NOT_FOUND
 * @param message - Thông báo lỗi
 */
export function throwNotFoundError(message: string): never {
  return throwHttpError(HttpStatus.NOT_FOUND, message);
}

/**
 * Throw lỗi BAD_REQUEST
 * @param message - Thông báo lỗi
 */
export function throwBadRequestError(message: string): never {
  return throwHttpError(HttpStatus.BAD_REQUEST, message);
}

/**
 * Throw lỗi UNPROCESSABLE_ENTITY
 * @param message - Thông báo lỗi
 */
export function throwUnprocessableEntityError(message: string): never {
  return throwHttpError(HttpStatus.UNPROCESSABLE_ENTITY, message);
}

/**
 * Throw lỗi UNAUTHORIZED
 * @param message - Thông báo lỗi
 */
export function throwUnauthorizedError(message: string): never {
  return throwHttpError(HttpStatus.UNAUTHORIZED, message);
}

/**
 * Throw lỗi FORBIDDEN
 * @param message - Thông báo lỗi
 */
export function throwForbiddenError(message: string): never {
  return throwHttpError(HttpStatus.FORBIDDEN, message);
}

/**
 * Throw lỗi CONFLICT
 * @param message - Thông báo lỗi
 */
export function throwConflictError(message: string): never {
  return throwHttpError(HttpStatus.CONFLICT, message);
}

/**
 * Throw lỗi INTERNAL_SERVER_ERROR
 * @param message - Thông báo lỗi
 */
export function throwInternalServerError(message: string): never {
  return throwHttpError(HttpStatus.INTERNAL_SERVER_ERROR, message);
}
