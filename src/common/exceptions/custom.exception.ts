import { HttpException, HttpStatus } from '@nestjs/common';

export class CustomException extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: any,
  ) {
    super(message, status);
  }

  static new(code: string, message: string, details?: any): CustomException {
    return new CustomException(code, message, HttpStatus.BAD_REQUEST, details);
  }

  static notFound(message: string, details?: any): CustomException {
    return new CustomException('NOT_FOUND', message, HttpStatus.NOT_FOUND, details);
  }

  static unauthorized(message: string, details?: any): CustomException {
    return new CustomException('UNAUTHORIZED', message, HttpStatus.UNAUTHORIZED, details);
  }

  static forbidden(message: string, details?: any): CustomException {
    return new CustomException('FORBIDDEN', message, HttpStatus.FORBIDDEN, details);
  }

  static conflict(message: string, details?: any): CustomException {
    return new CustomException('CONFLICT', message, HttpStatus.CONFLICT, details);
  }

  static internal(message: string, details?: any): CustomException {
    return new CustomException('INTERNAL_ERROR', message, HttpStatus.INTERNAL_SERVER_ERROR, details);
  }
}