import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module'; // 프로젝트 PrismaModule 경로에 맞게 조정
import { GuideController } from './guide.controller';
import { GuideService } from './guide.service';
import { VertexService } from './vertex.service';

/**
 * 진학지도 자료(특별전형 목록 + 서술형 RAG) 모듈.
 * AppModule의 imports 에 GuideModule 추가하면 활성화된다.
 */
@Module({
  imports: [PrismaModule],
  controllers: [GuideController],
  providers: [GuideService, VertexService],
  exports: [GuideService],
})
export class GuideModule {}
