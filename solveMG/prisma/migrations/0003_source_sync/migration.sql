CREATE TABLE "source_sync_records" (
  "id" UUID NOT NULL,
  "source_schema" TEXT NOT NULL,
  "source_table" TEXT NOT NULL,
  "source_id" TEXT NOT NULL,
  "target_type" TEXT NOT NULL,
  "target_id" UUID NOT NULL,
  "source_updated_at" TIMESTAMP(3),
  "source_hash" TEXT,
  "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "source_sync_records_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "source_sync_records_source_key" ON "source_sync_records"("source_schema", "source_table", "source_id");
CREATE UNIQUE INDEX "source_sync_records_target_key" ON "source_sync_records"("target_type", "target_id", "source_table");
CREATE INDEX "source_sync_records_table_updated_idx" ON "source_sync_records"("source_table", "source_updated_at");