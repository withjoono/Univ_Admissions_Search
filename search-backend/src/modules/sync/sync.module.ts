import { Module } from '@nestjs/common';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';
import { SyncScheduler } from './sync.scheduler';
import { SusiReadRepository } from './source/susi.read-repository';
import { JungsiReadRepository } from './source/jungsi.read-repository';

@Module({
  controllers: [SyncController],
  providers: [SyncService, SyncScheduler, SusiReadRepository, JungsiReadRepository],
  exports: [SyncService],
})
export class SyncModule {}
