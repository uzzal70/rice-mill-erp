import { of } from 'rxjs';
import { ExecutionContext, CallHandler, StreamableFile } from '@nestjs/common';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor (#71 API Response Standard)', () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  const mockContext = {} as ExecutionContext;

  it('should wrap arbitrary data in standard { success, message, data, meta } shape', (done) => {
    const callHandler: CallHandler = {
      handle: () => of({ id: 'order-123', totalAmount: 5000 }),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        message: 'Operation completed successfully.',
        data: { id: 'order-123', totalAmount: 5000 },
        meta: {},
      });
      done();
    });
  });

  it('should preserve already formatted responses with custom message and meta', (done) => {
    const callHandler: CallHandler = {
      handle: () => of({
        success: true,
        message: 'Batch posted successfully.',
        data: { batchNumber: 'BAT-2026-001' },
        meta: { approvedBy: 'user-1' },
      }),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        message: 'Batch posted successfully.',
        data: { batchNumber: 'BAT-2026-001' },
        meta: { approvedBy: 'user-1' },
      });
      done();
    });
  });

  it('should handle paginated data and map meta cleanly', (done) => {
    const callHandler: CallHandler = {
      handle: () => of({
        data: [{ id: 'item-1' }, { id: 'item-2' }],
        meta: { total: 2, page: 1, limit: 25 },
      }),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toEqual({
        success: true,
        message: 'Operation completed successfully.',
        data: [{ id: 'item-1' }, { id: 'item-2' }],
        meta: { total: 2, page: 1, limit: 25 },
      });
      done();
    });
  });

  it('should bypass transformation for StreamableFile streams', (done) => {
    const stream = new StreamableFile(Buffer.from('PDF_CONTENT'));
    const callHandler: CallHandler = {
      handle: () => of(stream),
    };

    interceptor.intercept(mockContext, callHandler).subscribe((result) => {
      expect(result).toBe(stream);
      expect(result instanceof StreamableFile).toBe(true);
      done();
    });
  });
});

