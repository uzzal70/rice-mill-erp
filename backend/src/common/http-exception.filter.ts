import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

export interface StandardErrorResponse {
  success: false;
  message: string;
  errors: string[];
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected internal error occurred. Please contact system support.';
    let errors: string[] = [];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
        errors = [res];
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        if (Array.isArray(resObj.message)) {
          errors = resObj.message.map(m => String(m));
          message = errors[0] || 'Validation error.';
        } else if (typeof resObj.message === 'string') {
          message = resObj.message;
          errors = [resObj.message];
        } else if (typeof resObj.error === 'string') {
          message = resObj.error;
          errors = [resObj.error];
        }
      }
    } else if (exception && typeof exception === 'object' && 'code' in exception) {
      // Prisma known request errors or DB engine exceptions
      const prismaError = exception as { code: string; meta?: Record<string, unknown>; message?: string };
      this.logger.error(`Database Exception [${prismaError.code}] shielded from client.`);

      status = HttpStatus.BAD_REQUEST;
      switch (prismaError.code) {
        case 'P2002': {
          const target = prismaError.meta?.target;
          const targetStr = Array.isArray(target) ? target.join(', ') : target ? String(target) : 'record';
          message = `A record with this ${targetStr} already exists in the system. Duplicate entries are prevented.`;
          errors = [message];
          break;
        }
        case 'P2003': {
          message = 'The referenced resource (such as partner, warehouse, or product) does not exist.';
          errors = [message];
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          message = 'The requested transaction or master record could not be found.';
          errors = [message];
          break;
        }
        default:
          message = 'A database integrity constraint prevented this transaction from completing.';
          errors = ['Integrity constraint violation.'];
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      // For general 500 errors, never expose internal implementation details or stack traces
      message = exception.message || 'An unexpected operational error occurred.';
      errors = [message];
    }

    const errorPayload: StandardErrorResponse = {
      success: false,
      message,
      errors,
    };

    response.status(status).json(errorPayload);
  }
}

