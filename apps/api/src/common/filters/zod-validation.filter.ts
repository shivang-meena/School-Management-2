import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ZodError } from 'zod';

@Catch(ZodError)
export class ZodValidationFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const formattedMessages = exception.errors.map((err) => {
      const field = err.path.join('.');
      if (!field) return err.message;
      const prettyField = field.charAt(0).toUpperCase() + field.slice(1);
      return `${prettyField}: ${err.message}`;
    });

    const primaryMessage = formattedMessages.length === 1
      ? formattedMessages[0]
      : formattedMessages.join(' | ');

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: primaryMessage || 'Validation failed. Please verify input fields.',
      details: formattedMessages,
    });
  }
}
