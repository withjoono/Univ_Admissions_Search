import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SyncService } from './sync.service';

/**
 * 내부 동기화 트리거. 운영에선 Cloud Scheduler가 호출하며 ServiceAuthGuard로 보호 예정(Phase 4).
 */
@ApiTags('internal')
@Controller('internal/sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post()
  @ApiOperation({ summary: '전형 데이터 동기화 (full | incremental)' })
  run(@Body('mode') mode: 'full' | 'incremental' = 'full') {
    return this.syncService.syncAll(mode);
  }
}
