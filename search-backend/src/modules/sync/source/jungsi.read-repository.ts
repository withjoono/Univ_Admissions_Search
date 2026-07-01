import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 정시(jungsi 스키마) 읽기 전용 리포지토리.
 * 외부 스키마 의존을 이 파일 한 곳에 격리 (스키마 변경 시 여기 + 통합테스트만 영향).
 * 절대 쓰기 금지 — search_app 계정은 jungsi에 SELECT만 보유.
 */
export interface JungsiAdmissionRow {
  source_id: string;
  year: number;
  university_name: string | null;
  region: string | null;
  establishment_type: string | null;
  department_name: string | null; // recruitment_name
  general_field_name: string | null;
  detailed_fields: string | null;
  admission_type: string | null;
  admission_name: string | null;
  recruitment_number: number | null;
  csat_ratio: string | null;
  school_record_ratio: string | null;
  interview_ratio: string | null;
  other_ratio: string | null;
  csat_required: string | null;
}

@Injectable()
export class JungsiReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** 정시 전형 읽기. jungsi.js_admission + susi.ss_university JOIN (대학은 susi 공용). */
  async fetchAdmissions(since?: Date): Promise<JungsiAdmissionRow[]> {
    // since가 있으면 증분(원본에 updated_at이 없으면 전체). 실제 컬럼 확인 후 조건 보강.
    return this.prisma.$queryRawUnsafe<JungsiAdmissionRow[]>(`
      SELECT
        a.id::text                          AS source_id,
        a.year                              AS year,
        u.name                              AS university_name,
        u.region                            AS region,
        u.establishment_type::text          AS establishment_type,
        a.recruitment_name                  AS department_name,
        a.general_field_name                AS general_field_name,
        a.detailed_fields                   AS detailed_fields,
        a.admission_type                    AS admission_type,
        a.admission_name                    AS admission_name,
        a.recruitment_number                AS recruitment_number,
        a.csat_ratio                        AS csat_ratio,
        a.school_record_ratio               AS school_record_ratio,
        a.interview_ratio                   AS interview_ratio,
        a.other_ratio                       AS other_ratio,
        a.csat_required                     AS csat_required
      FROM jungsi.js_admission a
      LEFT JOIN susi.ss_university u ON u.id = a.university_id
    `);
  }
}
