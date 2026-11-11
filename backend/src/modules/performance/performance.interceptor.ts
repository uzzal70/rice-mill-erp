import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = req?.method || 'METHOD';
    const url = req?.url || 'URL';

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (res && res.setHeader) {
          res.setHeader('X-Response-Time', `${duration}ms`);
        }
        if (duration > 200) {
          this.logger.warn(`SLOW QUERY DETECTED: [${method}] ${url} took ${duration}ms (Threshold: 200ms)`);
        }
      }),
    );
  }
}

