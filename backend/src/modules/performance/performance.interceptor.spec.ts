import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { PerformanceInterceptor } from './performance.interceptor';

describe('PerformanceInterceptor (#68)', () => {
  let interceptor: PerformanceInterceptor;

  beforeEach(() => {
    interceptor = new PerformanceInterceptor();
  });

  it('should set X-Response-Time header and measure execution duration', done => {
    const mockRequest = { method: 'GET', url: '/inventory' };
    const mockHeaders: Record<string, string> = {};
    const mockResponse = {
      setHeader: jest.fn((k, v) => {
        mockHeaders[k] = v;
      }),
    };

    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
    } as unknown as ExecutionContext;

    const mockHandler: CallHandler = {
      handle: () => of({ data: [1, 2, 3] }),
    };

    interceptor.intercept(mockContext, mockHandler).subscribe({
      next: res => {
        expect(res).toEqual({ data: [1, 2, 3] });
        expect(mockResponse.setHeader).toHaveBeenCalledWith(
          'X-Response-Time',
          expect.stringMatching(/^[0-9]+ms$/),
        );
        done();
      },
    });
  });
});

