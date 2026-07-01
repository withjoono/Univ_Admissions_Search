import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SuccessResponseInterceptor } from './common/interceptors/success-response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableCors({ origin: true, credentials: true });

  // 생태계 공통 파이프라인
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
    new SuccessResponseInterceptor(),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const config = new DocumentBuilder()
    .setTitle('Univ Admissions Search API')
    .setDescription('거북스쿨 입시 검색·상담 백엔드')
    .setVersion('0.1')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('swagger', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT ?? 4011;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`search-backend listening on :${port} (swagger: /swagger)`);
}
bootstrap();
