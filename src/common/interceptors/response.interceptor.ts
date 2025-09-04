import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, ApiResponseInterface } from '../responses/api-response';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponseInterface<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseInterface<T>> {
    return next.handle().pipe(
      map((data) => {
        // If data is already an ApiResponse, return it as-is
        if (data && typeof data === 'object' && 'success' in data && 'timestamp' in data) {
          return data;
        }
        
        // Otherwise, wrap it in a success response
        return ApiResponse.success(data);
      }),
    );
  }
}