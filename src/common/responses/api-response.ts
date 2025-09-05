export interface ApiResponseInterface<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  error?: {
    code: string;
    message?: string;
    details?: any;
  };
}

export class ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  timestamp: string;
  error?: {
    code: string;
    message?: string;
    details?: any;
  };

  constructor(
    success: boolean,
    data: T,
    message: string,
    error?: { code: string; message?: string; details?: any },
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.error = error;
  }

  static success<T>(data: T, message = 'Success'): ApiResponse<T> {
    return new ApiResponse(true, data, message);
  }

  static error(
    code: string,
    message: string,
    details?: any,
  ): ApiResponse<null> {
    return new ApiResponse<null>(false, null, message, {
      code,
      message,
      details,
    });
  }
}
