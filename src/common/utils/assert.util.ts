import { CustomException } from '../exceptions/custom.exception';

export class Assert {
  static isTrue(condition: boolean, message: string, code = 'ASSERTION_FAILED'): void {
    if (!condition) {
      throw CustomException.new(code, message);
    }
  }

  static isFalse(condition: boolean, message: string, code = 'ASSERTION_FAILED'): void {
    if (condition) {
      throw CustomException.new(code, message);
    }
  }

  static notNull<T>(value: T | null | undefined, message: string, code = 'NOT_FOUND'): asserts value is T {
    if (value === null || value === undefined) {
      throw CustomException.notFound(message);
    }
  }

  static isNull(value: any, message: string, code = 'ASSERTION_FAILED'): void {
    if (value !== null && value !== undefined) {
      throw CustomException.new(code, message);
    }
  }

  static isEmail(email: string, message = 'Invalid email format'): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw CustomException.new('INVALID_EMAIL', message);
    }
  }

  static minLength(value: string, minLength: number, message?: string): void {
    if (value.length < minLength) {
      throw CustomException.new(
        'INVALID_LENGTH',
        message || `Value must be at least ${minLength} characters long`,
      );
    }
  }

  static maxLength(value: string, maxLength: number, message?: string): void {
    if (value.length > maxLength) {
      throw CustomException.new(
        'INVALID_LENGTH',
        message || `Value must be no more than ${maxLength} characters long`,
      );
    }
  }
}