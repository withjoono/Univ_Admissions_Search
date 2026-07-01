import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

/** 생태계 공통 에러 포맷: { success: false, error: { code, message } } */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = exception instanceof HttpException ? exception.getResponse() : null;
    const message =
      typeof payload === 'string'
        ? payload
        : (payload as any)?.message ?? (exception as Error)?.message ?? 'Internal server error';

    res.status(status).json({
      success: false,
      error: { code: `C${status}`, message },
    });
  }
}
