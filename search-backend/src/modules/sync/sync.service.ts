import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SusiReadRepository, SusiAdmissionRow } from './source/susi.read-repository';
import { JungsiReadRepository, JungsiAdmissionRow } from './source/jungsi.read-repository';

type Mode = 'full' | 'incremental';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly susi: SusiReadRepository,
    private readonly jungsi: JungsiReadRepository,
  ) {}

  /** susi/jungsi 전형 → search.srch_admission upsert. 멱등(upsert 기반). */
  async syncAll(mode: Mode = 'full') {
    const susiResult = await this.runOne('susi', mode);
    const jungsiResult = await this.runOne('jungsi', mode);
    return { susi: susiResult, jungsi: jungsiResult };
  }

  private async runOne(sourceApp: 'susi' | 'jungsi', mode: Mode) {
    const log = await this.prisma.srchSyncLog.create({
      data: { sourceApp, mode, status: 'running' },
    });
    // 증분: 마지막 성공 시각 이후만. (원본 updated_at 컬럼 확인 후 repository에서 활용)
    const since = mode === 'incremental' ? await this.lastSuccessAt(sourceApp) : undefined;
    let rowsRead = 0;
    let rowsUpserted = 0;
    try {
      if (sourceApp === 'susi') {
        const rows = await this.susi.fetchAdmissions(since);
        rowsRead = rows.length;
        for (const r of rows) rowsUpserted += await this.upsertSusi(r);
      } else {
        const rows = await this.jungsi.fetchAdmissions(since);
        rowsRead = rows.length;
        for (const r of rows) rowsUpserted += await this.upsertJungsi(r);
      }
      await this.prisma.srchSyncLog.update({
        where: { id: log.id },
        data: { status: 'success', finishedAt: new Date(), rowsRead, rowsUpserted },
      });
      this.logger.log(`[${sourceApp}] sync ok: read=${rowsRead} upserted=${rowsUpserted}`);
    } catch (e) {
      await this.prisma.srchSyncLog.update({
        where: { id: log.id },
        data: { status: 'failed', finishedAt: new Date(), rowsRead, error: String(e) },
      });
      this.logger.error(`[${sourceApp}] sync failed: ${e}`);
      throw e;
    }
    return { rowsRead, rowsUpserted };
  }

  /** 해당 소스의 마지막 성공 동기화 시각 (증분 기준점) */
  private async lastSuccessAt(sourceApp: string): Promise<Date | undefined> {
    const last = await this.prisma.srchSyncLog.findFirst({
      where: { sourceApp, status: 'success' },
      orderBy: { finishedAt: 'desc' },
    });
    return last?.finishedAt ?? undefined;
  }

  private async upsertSusi(r: SusiAdmissionRow): Promise<number> {
    const ratios = {
      교과: r.subject_ratio,
      서류: r.document_ratio,
      면접: r.interview_ratio,
      실기: r.practical_ratio,
    };
    const description = [
      r.university_name, r.department_name, r.admission_name, r.admission_type,
      r.field_general, r.field_mid, r.field_minor, r.region,
    ].filter(Boolean).join(' ');

    await this.prisma.srchAdmission.upsert({
      where: { uq_source: { sourceApp: 'susi', sourceId: r.source_id } },
      create: this.toSusiData(r, ratios, description),
      update: this.toSusiData(r, ratios, description),
    });
    return 1;
  }

  private toSusiData(r: SusiAdmissionRow, ratios: object, description: string) {
    return {
      trackType: 'SUSI',
      curriculum: 'Y2015', // TODO: 학년도/교육과정 매핑 규칙 확정 시 분기
      year: r.year,
      universityName: r.university_name ?? '',
      region: r.region,
      establishmentType: r.establishment_type,
      departmentName: r.department_name ?? '',
      fieldGeneral: r.field_general,
      fieldMid: r.field_mid,
      fieldMinor: r.field_minor,
      admissionType: r.admission_type ?? '',
      admissionName: r.admission_name ?? '',
      recruitmentNumber: r.recruitment_number,
      ratios,
      minGradeDesc: r.min_grade_desc,
      hasInterview: !!r.has_interview,
      descriptionText: description,
      sourceApp: 'susi',
      sourceId: r.source_id,
    };
  }

  private async upsertJungsi(r: JungsiAdmissionRow): Promise<number> {
    const ratios = {
      수능: r.csat_ratio,
      교과: r.school_record_ratio,
      면접: r.interview_ratio,
      기타: r.other_ratio,
    };
    const description = [
      r.university_name, r.department_name, r.admission_name, r.admission_type,
      r.general_field_name, r.detailed_fields, r.region,
    ].filter(Boolean).join(' ');

    const data = {
      trackType: 'JEONGSI',
      curriculum: 'Y2015',
      year: r.year,
      universityName: r.university_name ?? '',
      region: r.region,
      establishmentType: r.establishment_type,
      departmentName: r.department_name ?? '',
      fieldGeneral: r.general_field_name,
      admissionType: r.admission_type ?? '',
      admissionName: r.admission_name ?? '',
      recruitmentNumber: r.recruitment_number,
      ratios,
      csatRequired: r.csat_required,
      hasInterview: !!(r.interview_ratio && r.interview_ratio !== '0'),
      descriptionText: description,
      sourceApp: 'jungsi',
      sourceId: r.source_id,
    };

    await this.prisma.srchAdmission.upsert({
      where: { uq_source: { sourceApp: 'jungsi', sourceId: r.source_id } },
      create: data,
      update: data,
    });
    return 1;
  }
}
