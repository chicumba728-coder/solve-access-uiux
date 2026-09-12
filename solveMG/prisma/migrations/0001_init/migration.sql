-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'DEACTIVATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'FROZEN', 'DEACTIVATED', 'CLOSED');

-- CreateEnum
CREATE TYPE "FinancialStatus" AS ENUM ('PAID', 'PENDING', 'OVERDUE', 'FROZEN', 'RELEASED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'VOIDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER', 'MOBILE_MONEY', 'OTHER');

-- CreateEnum
CREATE TYPE "FreezeStatus" AS ENUM ('ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReleaseStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'VOIDED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'EXCUSED');

-- CreateEnum
CREATE TYPE "IntegrationTarget" AS ENUM ('CRM', 'OVG');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'PROCESSING', 'DELIVERED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL,
    "client_number" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "photo_url" TEXT,
    "birth_date" DATE,
    "gender" TEXT,
    "tax_id" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deactivated_at" TIMESTAMP(3),
    "deactivated_by" UUID,
    "created_by" UUID,
    "updated_by" UUID,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "lessons_per_period" INTEGER,
    "validity_months" INTEGER NOT NULL DEFAULT 1,
    "usage_rules" JSONB NOT NULL,
    "is_unlimited" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "started_on" DATE NOT NULL,
    "ended_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" UUID,
    "ended_by" UUID,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plan_versions" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "lessons_per_period" INTEGER,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "change_reason" TEXT NOT NULL,
    "changed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_periods" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "plan_version_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "calendar_year" INTEGER NOT NULL,
    "calendar_month" INTEGER NOT NULL,
    "sequence_no" INTEGER NOT NULL,
    "lessons_entitled" INTEGER,
    "amount_due" DECIMAL(12,2) NOT NULL,
    "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount_open" DECIMAL(12,2) NOT NULL,
    "released_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "financial_status" "FinancialStatus" NOT NULL DEFAULT 'PENDING',
    "calculation_origin" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "idempotency_key" TEXT,
    "recorded_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "billing_period_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "payment_id" UUID,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "tax_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "weekday" INTEGER NOT NULL,
    "capacity" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendances" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "source" TEXT NOT NULL,
    "recorded_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freezes" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "starts_on" DATE NOT NULL,
    "ends_on" DATE,
    "reason" TEXT NOT NULL,
    "status" "FreezeStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_by" UUID NOT NULL,
    "ended_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "freezes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "period_releases" (
    "id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "billing_period_id" UUID NOT NULL,
    "original_amount" DECIMAL(12,2) NOT NULL,
    "released_amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReleaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "released_at" TIMESTAMP(3) NOT NULL,
    "released_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "period_releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "before_data" JSONB,
    "after_data" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_events" (
    "id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" UUID NOT NULL,
    "target" "IntegrationTarget" NOT NULL,
    "payload" JSONB NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_parameters" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_parameters_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_name_key" ON "permissions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "clients_client_number_key" ON "clients"("client_number");

-- CreateIndex
CREATE INDEX "clients_status_idx" ON "clients"("status");

-- CreateIndex
CREATE INDEX "clients_full_name_idx" ON "clients"("full_name");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE INDEX "plans_is_active_idx" ON "plans"("is_active");

-- CreateIndex
CREATE INDEX "subscriptions_client_id_status_idx" ON "subscriptions"("client_id", "status");

-- CreateIndex
CREATE INDEX "subscription_plan_versions_subscription_id_valid_from_idx" ON "subscription_plan_versions"("subscription_id", "valid_from" DESC);

-- CreateIndex
CREATE INDEX "subscription_plan_versions_plan_id_valid_from_valid_to_idx" ON "subscription_plan_versions"("plan_id", "valid_from", "valid_to");

-- CreateIndex
CREATE INDEX "billing_periods_client_id_financial_status_period_start_idx" ON "billing_periods"("client_id", "financial_status", "period_start");

-- CreateIndex
CREATE INDEX "billing_periods_calendar_year_calendar_month_idx" ON "billing_periods"("calendar_year", "calendar_month");

-- CreateIndex
CREATE UNIQUE INDEX "billing_periods_subscription_id_period_start_period_end_key" ON "billing_periods"("subscription_id", "period_start", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "billing_periods_subscription_id_calendar_year_calendar_mont_key" ON "billing_periods"("subscription_id", "calendar_year", "calendar_month", "sequence_no");

-- CreateIndex
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "payments_client_id_paid_at_idx" ON "payments"("client_id", "paid_at");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payment_allocations_billing_period_id_idx" ON "payment_allocations"("billing_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_payment_id_billing_period_id_key" ON "payment_allocations"("payment_id", "billing_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "invoices_client_id_issued_at_idx" ON "invoices"("client_id", "issued_at");

-- CreateIndex
CREATE INDEX "classes_starts_at_is_active_idx" ON "classes"("starts_at", "is_active");

-- CreateIndex
CREATE INDEX "attendances_client_id_occurred_at_idx" ON "attendances"("client_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attendances_client_id_class_id_occurred_at_key" ON "attendances"("client_id", "class_id", "occurred_at");

-- CreateIndex
CREATE INDEX "freezes_subscription_id_status_idx" ON "freezes"("subscription_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "period_releases_billing_period_id_status_key" ON "period_releases"("billing_period_id", "status");

-- CreateIndex
CREATE INDEX "audit_events_entity_type_entity_id_occurred_at_idx" ON "audit_events"("entity_type", "entity_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "audit_events_actor_user_id_occurred_at_idx" ON "audit_events"("actor_user_id", "occurred_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "integration_events_idempotency_key_key" ON "integration_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "integration_events_status_next_attempt_at_idx" ON "integration_events"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "integration_events_target_aggregate_type_aggregate_id_idx" ON "integration_events"("target", "aggregate_type", "aggregate_id");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clients" ADD CONSTRAINT "clients_deactivated_by_fkey" FOREIGN KEY ("deactivated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan_versions" ADD CONSTRAINT "subscription_plan_versions_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_plan_version_id_fkey" FOREIGN KEY ("plan_version_id") REFERENCES "subscription_plan_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_billing_period_id_fkey" FOREIGN KEY ("billing_period_id") REFERENCES "billing_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freezes" ADD CONSTRAINT "freezes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freezes" ADD CONSTRAINT "freezes_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freezes" ADD CONSTRAINT "freezes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freezes" ADD CONSTRAINT "freezes_ended_by_fkey" FOREIGN KEY ("ended_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_releases" ADD CONSTRAINT "period_releases_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_releases" ADD CONSTRAINT "period_releases_billing_period_id_fkey" FOREIGN KEY ("billing_period_id") REFERENCES "billing_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "period_releases" ADD CONSTRAINT "period_releases_released_by_fkey" FOREIGN KEY ("released_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain checks and operational indexes not expressible in the Prisma datamodel.
ALTER TABLE "plans" ADD CONSTRAINT "plans_price_non_negative" CHECK ("price" >= 0);
ALTER TABLE "plans" ADD CONSTRAINT "plans_validity_positive" CHECK ("validity_months" > 0);
ALTER TABLE "plans" ADD CONSTRAINT "plans_lessons_valid" CHECK ("is_unlimited" = true OR "lessons_per_period" > 0);
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_dates_valid" CHECK ("period_end" >= "period_start");
ALTER TABLE "billing_periods" ADD CONSTRAINT "billing_periods_amounts_valid" CHECK ("amount_due" >= 0 AND "amount_paid" >= 0 AND "amount_open" >= 0 AND "released_amount" >= 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_dates_valid" CHECK ("ended_on" IS NULL OR "ended_on" >= "started_on");
ALTER TABLE "freezes" ADD CONSTRAINT "freezes_dates_valid" CHECK ("ends_on" IS NULL OR "ends_on" >= "starts_on");

CREATE UNIQUE INDEX "clients_tax_id_unique_when_present" ON "clients"("tax_id") WHERE "tax_id" IS NOT NULL;
CREATE UNIQUE INDEX "one_active_subscription_per_client" ON "subscriptions"("client_id") WHERE "status" = 'ACTIVE';
CREATE INDEX "payments_confirmed_by_date" ON "payments"("paid_at") WHERE "status" = 'CONFIRMED';
CREATE INDEX "attendances_client_date_desc" ON "attendances"("client_id", "occurred_at" DESC);

