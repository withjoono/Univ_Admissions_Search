import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 수시(susi 스키마) 읽기 전용 리포지토리.
 * grain = ss_recruitment_unit(모집단위) 1행 + 상위 ss_admission/method/university JOIN.
 * 외부 스키마 의존을 이 파일에 격리. 절대 쓰기 금지.
 */
export interface SusiAdmissionRow {
  source_id: string; // recruitment_unit id
  year: number;
  university_name: string | null;
  region: string | null;
  establishment_type: string | null;
  department_name: string | null; // recruitment_unit.name
  field_general: string | null;
  field_mid: string | null;
  field_minor: string | null;
  admission_type: string | null; // category
  admission_name: string | null;
  recruitment_number: number | null;
  subject_ratio: string | null;
  document_ratio: string | null;
  interview_ratio: string | null;
  practical_ratio: string | null;
  min_grade_desc: string | null;
  has_interview: boolean | null;
}

@Injectable()
export class SusiReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async fetchAdmissions(since?: Date): Promise<SusiAdmissionRow[]> {
    return this.prisma.$queryRawUnsafe<SusiAdmissionRow[]>(`
      SELECT
        ru.id::text                         AS source_id,
        ad.year                             AS year,
        u.name                              AS university_name,
        u.region                            AS region,
        u.establishment_type::text          AS establishment_type,
        ru.name                             AS department_name,
        gf.name                             AS field_general,
        mid.name                            AS field_mid,
        mf.name                             AS field_minor,
        cat.name                            AS admission_type,
        ad.name                             AS admission_name,
        ru.recruitment_number               AS recruitment_number,
        m.subject_ratio::text               AS subject_ratio,
        m.document_ratio::text              AS document_ratio,
        m.interview_ratio::text             AS interview_ratio,
        m.practical_ratio::text             AS practical_ratio,
        mg.description                      AS min_grade_desc,
        COALESCE(iv.is_reflected, false)    AS has_interview
      FROM susi.ss_recruitment_unit ru
      JOIN susi.ss_admission ad            ON ad.id = ru.admission_id
      LEFT JOIN susi.ss_university u        ON u.id = ad.university_id
      LEFT JOIN susi.ss_admission_category cat ON cat.id = ad.category_id
      LEFT JOIN susi.ss_admission_method m ON m.admission_id = ad.id
      LEFT JOIN susi.ss_general_field gf    ON gf.id = ru.general_field_id
      LEFT JOIN susi.ss_minor_field mf      ON mf.id = ru.minor_field_id
      LEFT JOIN susi.ss_mid_field mid       ON mid.id = mf.mid_field_id
      LEFT JOIN susi.ss_recruitment_unit_interview iv ON iv.recruitment_unit_id = ru.id
      LEFT JOIN susi.ss_recruitment_unit_minimum_grade mg ON mg.recruitment_unit_id = ru.id
    `);
  }
}
