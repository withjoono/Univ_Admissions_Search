-- CreateTable
CREATE TABLE "srch_guide_admission" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 2027,
    "category" TEXT NOT NULL,
    "region" TEXT,
    "university_name" TEXT NOT NULL,
    "department_name" TEXT,
    "admission_type" TEXT,
    "admission_name" TEXT,
    "recruitment_text" TEXT,
    "recruitment_number" INTEGER,
    "method" TEXT,
    "csat_min_desc" TEXT,
    "note" TEXT,
    "search_text" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "source_file" TEXT NOT NULL,
    "source_page" INTEGER NOT NULL,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "srch_guide_admission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srch_knowledge_chunk" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL DEFAULT 2027,
    "doc" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "source_file" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "srch_knowledge_chunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srch_knowledge_embedding" (
    "chunk_id" INTEGER NOT NULL,
    "embedding" infocast.vector(768),
    "model" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "srch_knowledge_embedding_pkey" PRIMARY KEY ("chunk_id")
);

-- CreateIndex
CREATE INDEX "srch_guide_admission_category_year_idx" ON "srch_guide_admission"("category", "year");

-- CreateIndex
CREATE INDEX "srch_guide_admission_region_idx" ON "srch_guide_admission"("region");

-- CreateIndex
CREATE INDEX "srch_guide_admission_university_name_idx" ON "srch_guide_admission"("university_name");

-- CreateIndex
CREATE INDEX "srch_knowledge_chunk_doc_year_idx" ON "srch_knowledge_chunk"("doc", "year");

-- AddForeignKey
ALTER TABLE "srch_knowledge_embedding" ADD CONSTRAINT "srch_knowledge_embedding_chunk_id_fkey" FOREIGN KEY ("chunk_id") REFERENCES "srch_knowledge_chunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

