import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  StreamableFile,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface StandardSuccessResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
  meta: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T = unknown> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map(data => {
        // StreamableFile, Buffer, or binary streams bypass transformation
        if (data instanceof StreamableFile || Buffer.isBuffer(data)) {
          return data;
        }

        // If response is already conforming to the standard shape
        if (data && typeof data === 'object' && 'success' in data && typeof (data as Record<string, unknown>).success === 'boolean') {
          const raw = data as Record<string, unknown>;
          return {
            success: Boolean(raw.success),
            message: typeof raw.message === 'string' ? raw.message : 'Operation successful.',
            data: raw.data !== undefined ? (raw.data as T) : data,
            meta: (raw.meta as Record<string, unknown>) ?? {},
          };
        }

        // If response has data and meta (e.g. paginated queries)
        if (data && typeof data === 'object' && 'data' in data && 'meta' in data) {
          const raw = data as { data: T; meta: Record<string, unknown>; message?: string };
          return {
            success: true,
            message: raw.message || 'Operation completed successfully.',
            data: raw.data,
            meta: raw.meta ?? {},
          };
        }

        // Standard wrapping for arrays, objects, or primitive returns
        return {
          success: true,
          message: 'Operation completed successfully.',
          data,
          meta: {},
        };
      }),
    );
  }
}
