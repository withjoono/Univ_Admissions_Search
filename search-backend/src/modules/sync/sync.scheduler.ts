import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SyncService } from './sync.service';

/**
 * 주기적 증분 동기화.
 * 운영에서는 Cloud Scheduler → POST /api/internal/sync 를 권장(인스턴스 스케일다운 대응).
 * 앱 내 cron은 SYNC_CRON_ENABLED=true 일 때만 동작.
 */
@Injectable()
export class SyncScheduler {
  private readonly logger = new Logger(SyncScheduler.name);
  private readonly enabled = process.env.SYNC_CRON_ENABLED === 'true';

  constructor(private readonly syncService: SyncService) {}

  // 매일 새벽 4시 (KST 가정) 증분 동기화
  @Cron('0 4 * * *')
  async nightlyIncremental() {
    if (!this.enabled) return;
    this.logger.log('야간 증분 동기화 시작');
    try {
      await this.syncService.syncAll('incremental');
    } catch (e) {
      this.logger.error(`야간 동기화 실패: ${e}`);
    }
  }
}
