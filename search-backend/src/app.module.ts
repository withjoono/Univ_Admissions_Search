import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { SearchModule } from './modules/search/search.module';
import { SyncModule } from './modules/sync/sync.module';
import { GuideModule } from './modules/guide/guide.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    SearchModule,
    SyncModule,
    GuideModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
