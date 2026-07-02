-- CreateExtension
-- vector 확장은 이미 infocast 스키마에 설치되어 있음(DB당 1개만 생성 가능) — 재생성 시도하지 않고 타입만 참조.

-- CreateTable
CREATE TABLE "srch_admission" (
    "id" SERIAL NOT NULL,
    "track_type" TEXT NOT NULL,
    "curriculum" TEXT NOT NULL DEFAULT 'Y2015',
    "year" INTEGER NOT NULL,
    "university_name" TEXT NOT NULL,
    "region" TEXT,
    "establishment_type" TEXT,
    "department_name" TEXT NOT NULL,
    "field_general" TEXT,
    "field_major" TEXT,
    "field_mid" TEXT,
    "field_minor" TEXT,
    "admission_type" TEXT NOT NULL,
    "admission_name" TEXT NOT NULL,
    "recruitment_number" INTEGER,
    "ratios" JSONB,
    "csat_required" TEXT,
    "min_grade_desc" TEXT,
    "has_interview" BOOLEAN NOT NULL DEFAULT false,
    "prev_results" JSONB,
    "risk_band" JSONB,
    "description_text" TEXT NOT NULL,
    "source_app" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_updated_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "srch_admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srch_embedding" (
    "admission_id" INTEGER NOT NULL,
    "embedding" infocast.vector(768),
    "model" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "srch_embedding_pkey" PRIMARY KEY ("admission_id")
);

-- CreateTable
CREATE TABLE "srch_sync_log" (
    "id" SERIAL NOT NULL,
    "source_app" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "rows_read" INTEGER NOT NULL DEFAULT 0,
    "rows_upserted" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'running',
    "error" TEXT,

    CONSTRAINT "srch_sync_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "srch_admission_track_type_curriculum_year_idx" ON "srch_admission"("track_type", "curriculum", "year");

-- CreateIndex
CREATE INDEX "srch_admission_region_idx" ON "srch_admission"("region");

-- CreateIndex
CREATE UNIQUE INDEX "srch_admission_source_app_source_id_key" ON "srch_admission"("source_app", "source_id");

-- AddForeignKey
ALTER TABLE "srch_embedding" ADD CONSTRAINT "srch_embedding_admission_id_fkey" FOREIGN KEY ("admission_id") REFERENCES "srch_admission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

