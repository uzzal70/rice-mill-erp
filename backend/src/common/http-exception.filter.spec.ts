import { BadRequestException, NotFoundException, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { GlobalExceptionFilter } from './http-exception.filter';

describe('GlobalExceptionFilter (#71 & #72 Error Handling)', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    } as unknown as ArgumentsHost;
  });

  it('should format standard HttpException with human-readable error response', () => {
    const errorMsg = 'Insufficient stock. Available: 1,250 KG. Requested: 1,500 KG.';
    const exception = new BadRequestException(errorMsg);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: errorMsg,
      errors: [errorMsg],
    });
  });

  it('should extract validation errors array from validation pipe exceptions', () => {
    const validationErrors = [
      'email must be an email',
      'password must be longer than or equal to 12 characters',
    ];
    const exception = new BadRequestException({
      statusCode: 400,
      message: validationErrors,
      error: 'Bad Request',
    });

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: validationErrors[0],
      errors: validationErrors,
    });
  });

  it('should shield raw Prisma P2002 unique constraint error and return human-friendly message', () => {
    const prismaError = {
      code: 'P2002',
      meta: { target: ['code', 'companyId'] },
      message: 'Unique constraint failed on the constraint: Company_code_key',
    };

    filter.catch(prismaError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const sentJson = mockResponse.json.mock.calls[0][0];
    expect(sentJson.success).toBe(false);
    expect(sentJson.message).toContain('Duplicate entries are prevented');
    expect(sentJson.message).not.toContain('Unique constraint failed on the constraint');
  });

  it('should shield raw Prisma P2003 foreign key violation and return safe message', () => {
    const prismaError = {
      code: 'P2003',
      meta: { field_name: 'partnerId' },
      message: 'Foreign key constraint failed on the field: `partnerId`',
    };

    filter.catch(prismaError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    const sentJson = mockResponse.json.mock.calls[0][0];
    expect(sentJson.success).toBe(false);
    expect(sentJson.message).toContain('referenced resource');
    expect(sentJson.message).not.toContain('Foreign key constraint failed');
  });

  it('should handle NotFoundException with 404 status code', () => {
    const exception = new NotFoundException('Gate entry GT-9999 was not found.');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: false,
      message: 'Gate entry GT-9999 was not found.',
      errors: ['Gate entry GT-9999 was not found.'],
    });
  });

  it('should shield raw unexpected Error and prevent database leakage', () => {
    const unhandledError = new Error('Database connection failed at postgresql://user:pass@internal-cluster:5432/ricemill');

    filter.catch(unhandledError, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const sentJson = mockResponse.json.mock.calls[0][0];
    expect(sentJson.success).toBe(false);
    expect(sentJson.errors).toBeDefined();
  });
});

