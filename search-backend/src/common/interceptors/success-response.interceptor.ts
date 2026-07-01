import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** 생태계 공통 응답 래핑: { success: true, data } */
@Injectable()
export class SuccessResponseInterceptor<T> implements NestInterceptor<T, { success: boolean; data: T }> {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<{ success: boolean; data: T }> {
    return next.handle().pipe(map((data) => ({ success: true, data })));
  }
}
