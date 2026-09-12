-- Fase 2: operação angolana, controlo de acesso físico e integração ZKTeco/OVG.
ALTER TYPE "PaymentMethod" ADD VALUE 'MULTICAIXA';
CREATE TYPE "TerminalType" AS ENUM ('ENTRY', 'EXIT');
CREATE TYPE "AccessType" AS ENUM ('ENTRY', 'EXIT');
CREATE TYPE "AccessResult" AS ENUM ('AUTHORIZED', 'DENIED', 'UNKNOWN_CLIENT', 'DUPLICATE', 'DEVICE_ERROR');

CREATE TABLE "gym_units" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "city" TEXT NOT NULL DEFAULT 'Luanda',
  "province" TEXT NOT NULL DEFAULT 'Luanda',
  "country" TEXT NOT NULL DEFAULT 'Angola',
  "timezone" TEXT NOT NULL DEFAULT 'Africa/Luanda',
  "currency" TEXT NOT NULL DEFAULT 'AOA',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "gym_units_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "gym_units_code_key" ON "gym_units"("code");
CREATE INDEX "gym_units_active_province_idx" ON "gym_units"("is_active", "province");
ALTER TABLE "gym_units" ADD CONSTRAINT "gym_units_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "clients" ADD COLUMN "unit_id" UUID;
ALTER TABLE "clients" ADD COLUMN "card_number" TEXT;
ALTER TABLE "clients" ADD COLUMN "device_pin" TEXT;
ALTER TABLE "clients" ADD COLUMN "access_limit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clients" ADD COLUMN "access_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clients" ADD COLUMN "access_debt" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "clients" ADD COLUMN "access_tolerance" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "clients" ADD COLUMN "access_blocked" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN "online" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "clients" ADD COLUMN "access_cycle_started_at" TIMESTAMP(3);
ALTER TABLE "clients" ADD COLUMN "ovg_customer_number" TEXT;
ALTER TABLE "clients" ADD COLUMN "ovg_synchronized" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX "clients_ovg_customer_number_key" ON "clients"("ovg_customer_number");
CREATE UNIQUE INDEX "clients_device_pin_key" ON "clients"("device_pin");
CREATE INDEX "clients_unit_status_idx" ON "clients"("unit_id", "status");
CREATE INDEX "clients_card_number_idx" ON "clients"("card_number");
ALTER TABLE "clients" ADD CONSTRAINT "clients_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "gym_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "clients" ADD CONSTRAINT "clients_access_values_valid" CHECK ("access_limit" >= -1 AND "access_count" >= 0 AND "access_tolerance" >= 0 AND "access_debt" <= 0);

CREATE TABLE "access_terminals" (
  "id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "serial_number" TEXT NOT NULL,
  "model" TEXT,
  "ip_address" TEXT,
  "port" INTEGER NOT NULL DEFAULT 4370,
  "type" "TerminalType" NOT NULL,
  "communication_key" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_selected" BOOLEAN NOT NULL DEFAULT false,
  "last_seen_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "access_terminals_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "access_terminals_serial_number_key" ON "access_terminals"("serial_number");
CREATE INDEX "access_terminals_unit_type_active_idx" ON "access_terminals"("unit_id", "type", "is_active");
ALTER TABLE "access_terminals" ADD CONSTRAINT "access_terminals_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "gym_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "access_events" (
  "id" UUID NOT NULL,
  "client_id" UUID,
  "terminal_id" UUID,
  "external_event_id" TEXT,
  "device_pin" TEXT,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "type" "AccessType" NOT NULL,
  "result" "AccessResult" NOT NULL,
  "reason" TEXT,
  "source" TEXT NOT NULL,
  "raw_payload" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "access_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "access_events_external_event_id_key" ON "access_events"("external_event_id");
CREATE INDEX "access_events_client_date_idx" ON "access_events"("client_id", "occurred_at" DESC);
CREATE INDEX "access_events_terminal_date_idx" ON "access_events"("terminal_id", "occurred_at" DESC);
CREATE INDEX "access_events_date_idx" ON "access_events"("occurred_at");
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_terminal_id_fkey" FOREIGN KEY ("terminal_id") REFERENCES "access_terminals"("id") ON DELETE SET NULL ON UPDATE CASCADE;
