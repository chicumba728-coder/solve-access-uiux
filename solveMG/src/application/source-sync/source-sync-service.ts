import crypto from 'node:crypto';
import { Prisma } from '@prisma/client';
import { env } from '../../infrastructure/config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { sourcePool, sourceTable } from '../../infrastructure/source/source-db.js';

const SOURCE_SCHEMA = env.SOURCE_DATABASE_SCHEMA;
const SOURCE_ACTOR = env.SOURCE_SYNC_ACTOR_USER_ID;

type SourceRow = Record<string, unknown>;

type SyncStats = {
  customers: number;
  legacyCustomers: number;
  plans: number;
  subscriptions: number;
  payments: number;
  terminals: number;
  accessEvents: number;
  legacyLogs: number;
  reports: number;
  integrationQueue: number;
  skipped: number;
};

function text(value: unknown): string | undefined {
  return value === null || value === undefined || String(value).trim() === '' ? undefined : String(value).trim();
}

function date(value: unknown): Date | undefined {
  const raw = text(value);
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function sourceId(row: SourceRow): string {
  const id = text(row.id) ?? text(row.id_cliente) ?? text(row.id_terminal) ?? text(row.id_acesso) ?? text(row.id_relatorio) ?? text(row.id_fila) ?? text(row.code) ?? text(row.customer_number);
  if (!id) throw new Error('Source row has no stable id/code');
  return id;
}

function hash(row: SourceRow): string {
  return crypto.createHash('sha256').update(JSON.stringify(row, Object.keys(row).sort())).digest('hex');
}

function syncRecordFields(row: SourceRow, sourceHash: string) {
  const sourceUpdatedAt = date(row.updated_at);
  return { ...(sourceUpdatedAt === undefined ? {} : { sourceUpdatedAt }), sourceHash, syncedAt: new Date() };
}

function sourceRecordKey(sourceTable: string, sourceId: string) {
  return { sourceSchema_sourceTable_sourceId: { sourceSchema: SOURCE_SCHEMA, sourceTable, sourceId } };
}

async function findSourceMapping(tx: Prisma.TransactionClient, sourceTable: string, sourceId: string) {
  return tx.sourceSyncRecord.findUnique({ where: sourceRecordKey(sourceTable, sourceId) });
}

async function saveSourceMapping(tx: Prisma.TransactionClient, input: { sourceTable: string; sourceId: string; targetType: string; targetId: string; row: SourceRow; sourceHash: string }) {
  const fields = syncRecordFields(input.row, input.sourceHash);
  await tx.sourceSyncRecord.upsert({
    where: sourceRecordKey(input.sourceTable, input.sourceId),
    update: { targetId: input.targetId, ...fields },
    create: { sourceSchema: SOURCE_SCHEMA, sourceTable: input.sourceTable, sourceId: input.sourceId, targetType: input.targetType, targetId: input.targetId, ...fields },
  });
}

function sourceState(value: unknown): 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'CLOSED' {
  const state = (text(value) ?? '').toLowerCase();
  if (['inativo', 'inactive', 'desativado', 'deactivated'].includes(state)) return 'DEACTIVATED';
  if (['encerrado', 'closed'].includes(state)) return 'CLOSED';
  return 'ACTIVE';
}

function paymentStatus(value: unknown): 'PENDING' | 'CONFIRMED' | 'VOIDED' | 'REFUNDED' {
  const state = (text(value) ?? '').toLowerCase();
  if (['pago', 'paid', 'confirmado', 'confirmed'].includes(state)) return 'CONFIRMED';
  if (['anulado', 'voided', 'cancelado', 'cancelled'].includes(state)) return 'VOIDED';
  if (['reembolsado', 'refunded'].includes(state)) return 'REFUNDED';
  return 'PENDING';
}

function paymentMethod(value: unknown): 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE_MONEY' | 'MULTICAIXA' | 'OTHER' {
  const method = (text(value) ?? '').toLowerCase();
  if (method.includes('multicaixa')) return 'MULTICAIXA';
  if (method.includes('numer') || method.includes('cash')) return 'CASH';
  if (method.includes('cart') || method.includes('card')) return 'CARD';
  if (method.includes('transfer')) return 'TRANSFER';
  if (method.includes('mobile') || method.includes('unitel') || method.includes('movicel')) return 'MOBILE_MONEY';
  return 'OTHER';
}

async function sourceRows(table: string, columns: string, orderBy = 'updated_at'): Promise<SourceRow[]> {
  const result = await sourcePool().query(`select ${columns} from ${sourceTable(table)} order by ${orderBy} asc nulls first`);
  return result.rows;
}

function legacyStatus(value: unknown): 'ACTIVE' | 'INACTIVE' | 'DEACTIVATED' | 'CLOSED' {
  const state = (text(value) ?? '').toLowerCase();
  if (['inativo', 'inactive', 'desativado', 'deactivated', 'bloqueado'].includes(state)) return 'DEACTIVATED';
  if (['encerrado', 'closed'].includes(state)) return 'CLOSED';
  return 'ACTIVE';
}

async function findLegacyClientTarget(tx: Prisma.TransactionClient, row: SourceRow): Promise<string | undefined> {
  const externalId = sourceId(row);
  const mapped = await findSourceMapping(tx, 'clientes', externalId);
  if (mapped) return mapped.targetId;
  const ovg = text(row.ovg_customer_number);
  const email = text(row.email);
  const nif = text(row.nif);
  const card = text(row.numero_cartao);
  if (ovg) {
    const existing = await tx.client.findUnique({ where: { ovgCustomerNumber: ovg }, select: { id: true } });
    if (existing) return existing.id;
  }
  if (email) {
    const existing = await tx.client.findFirst({ where: { email }, select: { id: true } });
    if (existing) return existing.id;
  }
  if (nif) {
    const existing = await tx.client.findFirst({ where: { taxId: nif }, select: { id: true } });
    if (existing) return existing.id;
  }
  if (card) {
    const existing = await tx.client.findFirst({ where: { cardNumber: card }, select: { id: true } });
    if (existing) return existing.id;
  }
  return undefined;
}

async function syncLegacyClient(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const sourceHash = hash(row);
  const existingMap = await findSourceMapping(tx, 'clientes', externalId);
  if (existingMap?.sourceHash === sourceHash) return;
  const targetId = await findLegacyClientTarget(tx, row);
  const accessLimit = Number(row.limite_entradas ?? 0);
  const accessCount = Math.max(0, Number(row.numero_entradas ?? 0));
  const cycleStartedAt = date(row.ciclo_inicio);
  const debt = accessLimit >= 0 ? Math.min(0, accessCount - accessLimit) : 0;
  const data = {
    fullName: text(row.nome) ?? `Cliente legado ${externalId}`,
    ...(text(row.genero) === undefined ? {} : { gender: text(row.genero) }),
    ...(date(row.data_nascimento) === undefined ? {} : { birthDate: date(row.data_nascimento) }),
    ...(text(row.nif) === undefined ? {} : { taxId: text(row.nif) }),
    ...(text(row.telefone) === undefined ? {} : { phone: text(row.telefone) }),
    ...(text(row.email) === undefined ? {} : { email: text(row.email) }),
    ...(text(row.numero_cartao) === undefined ? {} : { cardNumber: text(row.numero_cartao) }),
    ...(text(row.ovg_customer_number) === undefined ? {} : { ovgCustomerNumber: text(row.ovg_customer_number) }),
    status: legacyStatus(row.status),
    accessLimit: Number.isFinite(accessLimit) ? accessLimit : 0,
    accessCount,
    accessDebt: debt,
    accessBlocked: row.bloqueado === true,
    online: row.online === true,
    ...(cycleStartedAt === undefined ? {} : { accessCycleStartedAt: cycleStartedAt }),
  } as Prisma.ClientUncheckedCreateInput;
  const client = targetId
    ? await tx.client.update({ where: { id: targetId }, data: data as Prisma.ClientUncheckedUpdateInput })
    : await tx.client.create({ data: { ...data, clientNumber: `LEGACY-${externalId}` } });
  await saveSourceMapping(tx, { sourceTable: 'clientes', sourceId: externalId, targetType: 'Client', targetId: client.id, row, sourceHash });
}

async function legacyUnit(tx: Prisma.TransactionClient) {
  const existing = await tx.gymUnit.findUnique({ where: { code: 'SOURCE-LEGACY' } });
  if (existing) return existing;
  return tx.gymUnit.create({ data: { name: 'Unidade importada da origem', code: 'SOURCE-LEGACY', city: 'Luanda', province: 'Luanda', country: 'Angola', timezone: 'Africa/Luanda', currency: 'AOA' } });
}

function terminalType(value: unknown): 'ENTRY' | 'EXIT' {
  return (text(value) ?? '').toLowerCase().includes('sa') ? 'EXIT' : 'ENTRY';
}

async function syncLegacyTerminal(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const sourceHash = hash(row);
  const existingMap = await findSourceMapping(tx, 'terminais', externalId);
  if (existingMap?.sourceHash === sourceHash) return;
  const unit = await legacyUnit(tx);
  const data = { unitId: unit.id, name: text(row.nome_terminal) ?? `Terminal ${externalId}`, serialNumber: text(row.numero_serie) ?? `LEGACY-${externalId}`, ...(text(row.modelo) === undefined ? {} : { model: text(row.modelo) }), ...(text(row.ip) === undefined ? {} : { ipAddress: text(row.ip) }), port: Number(row.porta ?? 4370) || 4370, type: terminalType(row.tipo), ...(text(row.chave_comunicacao) === undefined ? {} : { communicationKey: text(row.chave_comunicacao) }), isActive: legacyStatus(row.status) === 'ACTIVE', isSelected: row.selecionado === true } as Prisma.AccessTerminalUncheckedCreateInput;
  const terminal = existingMap ? await tx.accessTerminal.update({ where: { id: existingMap.targetId }, data }) : await tx.accessTerminal.create({ data });
  await saveSourceMapping(tx, { sourceTable: 'terminais', sourceId: externalId, targetType: 'AccessTerminal', targetId: terminal.id, row, sourceHash });
}

function accessResult(value: unknown): 'AUTHORIZED' | 'DENIED' | 'UNKNOWN_CLIENT' | 'DUPLICATE' | 'DEVICE_ERROR' {
  const result = (text(value) ?? '').toLowerCase();
  if (['ok', 'autorizado', 'authorized', 'permitido'].includes(result)) return 'AUTHORIZED';
  if (result.includes('duplic')) return 'DUPLICATE';
  if (result.includes('dispositivo') || result.includes('device')) return 'DEVICE_ERROR';
  return 'DENIED';
}

function accessDate(dateValue: unknown, timeValue: unknown): Date {
  const { rawDate, rawTime } = sourceDateTimeParts(dateValue, timeValue);
  const parsed = new Date(`${rawDate}T${rawTime}Z`);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function dateOnly(value: Date): string {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
}

function sourceDateTimeParts(dateValue: unknown, timeValue: unknown): { rawDate: string; rawTime: string } {
  let dateText: string | undefined;
  if (dateValue instanceof Date && !Number.isNaN(dateValue.getTime())) {
    const d = dateValue;
    const isMidnight = d.getHours() === 0 && d.getMinutes() === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0;
    dateText = isMidnight ? dateOnly(d) : d.toISOString();
  } else {
    dateText = text(dateValue);
  }
  return {
    rawDate: dateText?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? '1970-01-01',
    rawTime: text(timeValue)?.match(/^\d{2}:\d{2}:\d{2}(\.\d{1,6})?/)?.[0] ?? '00:00:00',
  };
}

async function syncLegacyAccess(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const sourceHash = hash({ ...row, __syncVersion: 'access-local-time-v5' });
  const existingMap = await findSourceMapping(tx, 'acessos', externalId);
  if (existingMap?.sourceHash === sourceHash) return;
  const clientId = await mappedTarget(tx, 'clientes', row.cliente_id);
  const terminalMap = await mappedTarget(tx, 'terminais', row.terminal_id);
  const accessData = { ...(clientId === undefined ? {} : { clientId }), ...(terminalMap === undefined ? {} : { terminalId: terminalMap }), occurredAt: accessDate(row.data_acesso, row.hora_acesso), type: terminalType(row.tipo_acesso), result: accessResult(row.resultado), ...(text(row.motivo) === undefined ? {} : { reason: text(row.motivo) }), source: 'LEGACY_ACESSOS', rawPayload: { sourceTable: 'acessos', sourceRow: row } as Prisma.InputJsonObject } as Prisma.AccessEventUncheckedCreateInput;
  const event = await tx.accessEvent.upsert({ where: { externalEventId: `legacy:acessos:${externalId}` }, update: accessData as Prisma.AccessEventUncheckedUpdateInput, create: { ...accessData, externalEventId: `legacy:acessos:${externalId}` } });
  const parts = sourceDateTimeParts(row.data_acesso, row.hora_acesso);
  await tx.$executeRaw(Prisma.sql`UPDATE "access_events" SET "occurred_at" = ${`${parts.rawDate} ${parts.rawTime}`}::timestamp WHERE "id" = ${event.id}::uuid`);
  await saveSourceMapping(tx, { sourceTable: 'acessos', sourceId: externalId, targetType: 'AccessEvent', targetId: event.id, row, sourceHash });
}

async function syncLegacyLog(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const sourceHash = hash({ ...row, __syncVersion: 'access-local-time-v5' });
  const existingMap = await findSourceMapping(tx, 'solve_access_logs', externalId);
  if (existingMap?.sourceHash === sourceHash) return;
  const clientId = await mappedTarget(tx, 'clientes', row.customer_id);
  const devicePin = text(row.customer_id);
  const logData = { ...(clientId === undefined ? {} : { clientId }), ...(devicePin === undefined ? {} : { devicePin }), occurredAt: accessDate(row.access_date, row.access_time), type: terminalType(row.access_type), result: accessResult(row.result), ...(text(row.reason) === undefined ? {} : { reason: text(row.reason) }), source: 'LEGACY_SOLVE_LOGS', rawPayload: { sourceTable: 'solve_access_logs', sourceRow: row } as Prisma.InputJsonObject } as Prisma.AccessEventUncheckedCreateInput;
  const event = await tx.accessEvent.upsert({ where: { externalEventId: `legacy:solve_access_logs:${externalId}` }, update: logData as Prisma.AccessEventUncheckedUpdateInput, create: { ...logData, externalEventId: `legacy:solve_access_logs:${externalId}` } });
  const parts = sourceDateTimeParts(row.access_date, row.access_time);
  await tx.$executeRaw(Prisma.sql`UPDATE "access_events" SET "occurred_at" = ${`${parts.rawDate} ${parts.rawTime}`}::timestamp WHERE "id" = ${event.id}::uuid`);
  await saveSourceMapping(tx, { sourceTable: 'solve_access_logs', sourceId: externalId, targetType: 'AccessEvent', targetId: event.id, row, sourceHash });
}

async function syncOvgMember(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const sourceHash = hash(row);
  const existingMap = await findSourceMapping(tx, 'ovg_members', externalId);
  if (existingMap?.sourceHash === sourceHash) return;
  const existing = existingMap ?? await tx.client.findFirst({ where: { ovgCustomerNumber: externalId }, select: { id: true } }).then((client) => client ? { targetId: client.id } : null);
  const data = {
    fullName: text(row.name) ?? `Cliente OVG ${externalId}`,
    ...(text(row.sex) === undefined ? {} : { gender: text(row.sex) }),
    ...(text(row.nif) === undefined ? {} : { taxId: text(row.nif) }),
    ...(text(row.mobile_number) === undefined ? {} : { phone: text(row.mobile_number) }),
    ...(text(row.email) === undefined ? {} : { email: text(row.email) }),
    ovgCustomerNumber: externalId,
    ovgSynchronized: true,
    status: legacyStatus(row.status),
  } as Prisma.ClientUncheckedCreateInput;
  const client = existing
    ? await tx.client.update({ where: { id: existing.targetId }, data: data as Prisma.ClientUncheckedUpdateInput })
    : await tx.client.create({ data: { ...data, clientNumber: `OVG-${externalId}` } });
  await saveSourceMapping(tx, { sourceTable: 'ovg_members', sourceId: externalId, targetType: 'Client', targetId: client.id, row: { ...row, updated_at: row.synced_at }, sourceHash });
}

function parseJson(value: unknown): Prisma.InputJsonValue {
  if (typeof value !== 'string') return (value ?? {}) as Prisma.InputJsonValue;
  try { return JSON.parse(value) as Prisma.InputJsonValue; } catch { return { raw: value }; }
}

async function syncLegacyReport(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const sourceHash = hash(row);
  const existingMap = await findSourceMapping(tx, 'relatorios', externalId);
  if (existingMap?.sourceHash === sourceHash) return;
  const clientId = await mappedTarget(tx, 'clientes', row.cliente_id);
  if (!clientId) return;
  const audit = await tx.auditEvent.create({ data: { action: text(row.acao) ?? 'LEGACY_REPORT', entityType: 'Client', entityId: clientId, afterData: { legacyReportId: externalId, description: text(row.descricao), status: text(row.status), recordedAt: date(row.momento_registro) } } });
  await saveSourceMapping(tx, { sourceTable: 'relatorios', sourceId: externalId, targetType: 'AuditEvent', targetId: audit.id, row, sourceHash });
}

async function syncLegacyQueueItem(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const sourceHash = hash(row);
  const existingMap = await findSourceMapping(tx, 'fila_sincronizacao_ovg', externalId);
  if (existingMap?.sourceHash === sourceHash) return;
  const eventId = existingMap?.targetId ?? crypto.randomUUID();
  const status = text(row.status) === 'processado' ? 'DELIVERED' : text(row.status) === 'falha' ? 'FAILED' : 'PENDING';
  const queueError = text(row.erro);
  const event = await tx.integrationEvent.upsert({ where: { id: eventId }, update: { payload: parseJson(row.payload), status, attempts: Number(row.tentativas ?? 0), ...(queueError === undefined ? {} : { lastError: queueError }) }, create: { id: eventId, eventType: `legacy.${text(row.tipo_evento) ?? 'ovg'}`, aggregateType: 'LegacyOvgQueue', aggregateId: eventId, target: 'OVG', payload: parseJson(row.payload), idempotencyKey: `legacy:fila_sincronizacao_ovg:${externalId}`, status, attempts: Number(row.tentativas ?? 0), ...(queueError === undefined ? {} : { lastError: queueError }) } });
  await saveSourceMapping(tx, { sourceTable: 'fila_sincronizacao_ovg', sourceId: externalId, targetType: 'IntegrationEvent', targetId: event.id, row: { ...row, updated_at: row.data_criacao }, sourceHash });
}

async function syncCustomer(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const existingMap = await findSourceMapping(tx, 'customers', externalId);
  const sourceHash = hash(row);
  if (existingMap?.sourceHash === sourceHash) return;
  const customerData = {
    fullName: text(row.name) ?? `Cliente ${externalId}`,
    ...(text(row.gender) === undefined ? {} : { gender: text(row.gender) }),
    ...(date(row.birth_date) === undefined ? {} : { birthDate: date(row.birth_date) }),
    ...(text(row.nif) === undefined ? {} : { taxId: text(row.nif) }),
    ...(text(row.phone) === undefined ? {} : { phone: text(row.phone) }),
    ...(text(row.email) === undefined ? {} : { email: text(row.email) }),
    ...(text(row.ovg_id) === undefined ? {} : { ovgCustomerNumber: text(row.ovg_id) }),
    status: sourceState(row.state),
  } as Prisma.ClientUncheckedUpdateInput;
  const client = existingMap
    ? await tx.client.update({ where: { id: existingMap.targetId }, data: customerData })
    : await tx.client.create({ data: { clientNumber: `SRC-${externalId}`, ...customerData } as Prisma.ClientUncheckedCreateInput });
  await saveSourceMapping(tx, { sourceTable: 'customers', sourceId: externalId, targetType: 'Client', targetId: client.id, row, sourceHash });
}

async function syncPlan(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const existingMap = await findSourceMapping(tx, 'plans', externalId);
  const sourceHash = hash(row);
  if (existingMap?.sourceHash === sourceHash) return;
  const price = Number(row.price ?? 0);
  const data = { name: text(row.name) ?? `Plano ${externalId}`, price: new Prisma.Decimal(Number.isFinite(price) ? price : 0), validityMonths: Number(row.duration ?? 1) || 1, isActive: row.active !== false, isUnlimited: false, usageRules: { source: 'neon', sourcePlanId: externalId } };
  const sameNamePlan = existingMap ? null : await tx.plan.findUnique({ where: { name: data.name } });
  const plan = existingMap
    ? await tx.plan.update({ where: { id: existingMap.targetId }, data })
    : sameNamePlan
      ? await tx.plan.update({ where: { id: sameNamePlan.id }, data })
      : await tx.plan.create({ data });
  await saveSourceMapping(tx, { sourceTable: 'plans', sourceId: externalId, targetType: 'Plan', targetId: plan.id, row, sourceHash });
}

async function mappedTarget(tx: Prisma.TransactionClient, table: string, id: unknown): Promise<string | undefined> {
  const value = text(id);
  if (!value) return undefined;
  const mapping = await findSourceMapping(tx, table, value);
  return mapping?.targetId;
}

async function syncSubscription(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const clientId = await mappedTarget(tx, 'customers', row.customer_id);
  const planId = await mappedTarget(tx, 'plans', row.plan_id);
  if (!clientId || !planId) return;
  const existingMap = await findSourceMapping(tx, 'subscriptions', externalId);
  const sourceHash = hash(row);
  if (existingMap?.sourceHash === sourceHash) return;
  const data = { clientId, startedOn: date(row.start_date) ?? new Date(), ...(date(row.end_date) === undefined ? {} : { endedOn: date(row.end_date) }), status: row.active === false ? 'DEACTIVATED' as const : 'ACTIVE' as const } as Prisma.SubscriptionUncheckedCreateInput;
  const subscription = existingMap ? await tx.subscription.update({ where: { id: existingMap.targetId }, data }) : await tx.subscription.create({ data });
  const plan = await tx.plan.findUnique({ where: { id: planId } });
  if (plan && !(await tx.subscriptionPlanVersion.findFirst({ where: { subscriptionId: subscription.id, planId } }))) {
    await tx.subscriptionPlanVersion.create({ data: { subscriptionId: subscription.id, planId, price: plan.price, lessonsPerPeriod: plan.lessonsPerPeriod, validFrom: date(row.start_date) ?? new Date(), changeReason: 'Imported from read-only source bridge', ...(SOURCE_ACTOR === undefined ? {} : { changedById: SOURCE_ACTOR }) } });
  }
  await saveSourceMapping(tx, { sourceTable: 'subscriptions', sourceId: externalId, targetType: 'Subscription', targetId: subscription.id, row, sourceHash });
}

async function syncPayment(tx: Prisma.TransactionClient, row: SourceRow): Promise<void> {
  const externalId = sourceId(row);
  const clientId = await mappedTarget(tx, 'customers', row.customer_id);
  if (!clientId) return;
  const existingMap = await findSourceMapping(tx, 'payments', externalId);
  const sourceHash = hash(row);
  if (existingMap?.sourceHash === sourceHash) return;
  const reference = text(row.reference_code);
  const data = { clientId, amount: new Prisma.Decimal(Number(row.amount ?? 0)), paidAt: date(row.paid_at) ?? date(row.created_at) ?? new Date(), method: paymentMethod(row.method), status: paymentStatus(row.status), isHistoric: true, ...(reference === undefined ? {} : { reference }), ...(SOURCE_ACTOR === undefined ? {} : { recordedById: SOURCE_ACTOR }) } as Prisma.PaymentUncheckedCreateInput;
  const payment = existingMap ? await tx.payment.update({ where: { id: existingMap.targetId }, data }) : await tx.payment.create({ data });
  await saveSourceMapping(tx, { sourceTable: 'payments', sourceId: externalId, targetType: 'Payment', targetId: payment.id, row, sourceHash });
}

export async function syncFromSource(): Promise<SyncStats> {
  const stats: SyncStats = { customers: 0, legacyCustomers: 0, plans: 0, subscriptions: 0, payments: 0, terminals: 0, accessEvents: 0, legacyLogs: 0, reports: 0, integrationQueue: 0, skipped: 0 };
  const customerRows = await sourceRows('customers', 'id, code, name, email, phone, nif, birth_date, state, ovg_id, gender, updated_at');
  const legacyCustomerRows = await sourceRows('clientes', 'id_cliente, numero_cartao, nome, genero, telefone, email, nif, ovg_customer_number, data_nascimento, limite_entradas, numero_entradas, status, online, bloqueado, ciclo_inicio, data_atualizacao', 'id_cliente');
  const planRows = await sourceRows('plans', 'id, name, price, duration, active, updated_at');
  const subscriptionRows = await sourceRows('subscriptions', 'id, customer_id, plan_id, start_date, end_date, active, updated_at');
  const paymentRows = await sourceRows('payments', 'id, code, customer_id, amount, method, status, reference_code, paid_at, created_at, updated_at');
  const terminalRows = await sourceRows('terminais', 'id_terminal, nome_terminal, numero_serie, modelo, ip, porta, status, chave_comunicacao, tipo, selecionado, ultima_sincronizacao, data_atualizacao', 'id_terminal');
  const accessRows = await sourceRows('acessos', 'id_acesso, cliente_id, terminal_id, data_acesso, hora_acesso, tipo_acesso, resultado, motivo', 'id_acesso');
  const logRows = await sourceRows('solve_access_logs', 'id, customer_id, access_date, access_time, access_type, result, reason, synced_at', 'synced_at');
  const ovgRows = await sourceRows('ovg_members', 'customer_number, name, sex, nif, mobile_number, email, status, synced_at', 'synced_at');
  const reportRows = await sourceRows('relatorios', 'id_relatorio, cliente_id, acao, descricao, momento_registro, status', 'id_relatorio');
  const queueRows = await sourceRows('fila_sincronizacao_ovg', 'id_fila, tipo_evento, payload, tentativas, erro, data_criacao, status', 'id_fila');
  for (const row of customerRows) { await prisma.$transaction((tx) => syncCustomer(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.customers += 1; }
  for (const row of legacyCustomerRows) { await prisma.$transaction((tx) => syncLegacyClient(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.legacyCustomers += 1; }
  for (const row of planRows) { await prisma.$transaction((tx) => syncPlan(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.plans += 1; }
  for (const row of subscriptionRows) { await prisma.$transaction((tx) => syncSubscription(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.subscriptions += 1; }
  for (const row of paymentRows) { await prisma.$transaction((tx) => syncPayment(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.payments += 1; }
  for (const row of terminalRows) { await prisma.$transaction((tx) => syncLegacyTerminal(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.terminals += 1; }
  for (const row of accessRows) { await prisma.$transaction((tx) => syncLegacyAccess(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.accessEvents += 1; }
  for (const row of logRows) { await prisma.$transaction((tx) => syncLegacyLog(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.legacyLogs += 1; }
  for (const row of ovgRows) { await prisma.$transaction((tx) => syncOvgMember(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.legacyCustomers += 1; }
  for (const row of reportRows) { await prisma.$transaction((tx) => syncLegacyReport(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.reports += 1; }
  for (const row of queueRows) { await prisma.$transaction((tx) => syncLegacyQueueItem(tx, row), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); stats.integrationQueue += 1; }
  return stats;
}
