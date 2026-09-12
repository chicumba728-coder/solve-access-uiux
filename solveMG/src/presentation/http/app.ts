import bcrypt from 'bcryptjs';
import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { env } from '../../infrastructure/config/env.js';
import { prisma } from '../../infrastructure/database/prisma.js';
import { DomainError, UnauthorizedError } from '../../domain/shared/errors.js';
import { createSubscription, getClientSubscription, listPayments, recordPayment } from '../../application/billing/billing-service.js';
import { createClient, deactivateClient, getClient, listClients, updateClient } from '../../application/clients/client-service.js';
import { getDashboard } from '../../application/dashboard/dashboard-service.js';
import { freezeSubscription, getLastAttendance, recordAttendance, releasePeriod, unfreezeSubscription } from '../../application/operations/operations-service.js';
import { createPlan, getPlanDetail, listPlans } from '../../application/plans/plan-service.js';
import { listAccessEvents, processAccess } from '../../application/access/access-service.js';
import { listTerminals, registerTerminal } from '../../application/access/terminal-service.js';
import { createUnit, listUnits } from '../../application/access/unit-service.js';
import { renewAccessCycle } from '../../application/access/access-cycle-service.js';
import { syncFromSource } from '../../application/source-sync/source-sync-service.js';
import { asyncRoute } from './async-route.js';

declare global {
  namespace Express {
    interface Request { user?: { sub: string; roles: string[] } }
  }
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
const subscriptionSchema = z.object({ clientId: z.string().uuid(), planId: z.string().uuid(), startedOn: z.string().date(), months: z.number().int().min(1).max(120), changeReason: z.string().max(500).optional() });
const paymentSchema = z.object({ clientId: z.string().uuid(), amount: z.number().positive(), paidAt: z.string().datetime(), method: z.enum(['CASH', 'CARD', 'TRANSFER', 'MOBILE_MONEY', 'MULTICAIXA', 'OTHER']), reference: z.string().max(120).optional(), idempotencyKey: z.string().max(200).optional() });
const freezeSchema = z.object({ subscriptionId: z.string().uuid(), startsOn: z.string().date(), endsOn: z.string().date().optional(), reason: z.string().min(1).max(500) });
const releaseSchema = z.object({ periodId: z.string().uuid(), reason: z.string().min(1).max(500) });
const attendanceSchema = z.object({ clientId: z.string().uuid(), classId: z.string().uuid(), occurredAt: z.string().datetime(), status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']), source: z.string().min(1).max(50) });
const accessSchema = z.object({ clientId: z.string().uuid().optional(), devicePin: z.string().max(100).optional(), cardNumber: z.string().max(100).optional(), terminalId: z.string().uuid().optional(), externalEventId: z.string().max(200).optional(), occurredAt: z.string().datetime(), type: z.enum(['ENTRY', 'EXIT']), source: z.enum(['ADMS', 'SDK', 'API']), rawPayload: z.record(z.string(), z.unknown()).optional() }).refine((input) => input.clientId || input.devicePin || input.cardNumber, 'clientId, devicePin or cardNumber is required');
const terminalSchema = z.object({ unitId: z.string().uuid(), name: z.string().min(1).max(100), serialNumber: z.string().min(1).max(100), model: z.string().max(100).optional(), ipAddress: z.string().max(45).optional(), port: z.number().int().min(1).max(65535).optional(), type: z.enum(['ENTRY', 'EXIT']), communicationKey: z.string().max(100).optional() });
const unitSchema = z.object({ name: z.string().min(1).max(120), code: z.string().min(1).max(30), city: z.string().max(80).optional(), province: z.string().max(80).optional(), timezone: z.string().max(80).optional(), currency: z.literal('AOA').optional() });
const renewalSchema = z.object({ newLimit: z.number().int().min(-1) });
const createClientSchema = z.object({
  fullName: z.string().min(2).max(200),
  gender: z.string().max(20).optional(),
  birthDate: z.string().date().optional(),
  taxId: z.string().max(40).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  cardNumber: z.string().max(100).optional(),
  devicePin: z.string().max(100).optional(),
  unitId: z.string().uuid().optional(),
  accessLimit: z.number().int().min(-1).optional(),
  accessTolerance: z.number().int().min(0).optional(),
});
const updateClientSchema = createClientSchema.partial();
const planCreateSchema = z.object({
  name: z.string().min(1).max(120),
  price: z.number().nonnegative(),
  lessonsPerPeriod: z.number().int().min(1).optional(),
  validityMonths: z.number().int().min(1).optional(),
  isUnlimited: z.boolean().optional(),
  usageRules: z.record(z.string(), z.unknown()).optional(),
});

function authenticate(request: Request, _response: Response, next: NextFunction): void {
  const header = request.header('authorization');
  if (!header?.startsWith('Bearer ')) return next(new UnauthorizedError());
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_SECRET);
    if (typeof payload === 'string' || !payload.sub) return next(new UnauthorizedError());
    request.user = { sub: payload.sub, roles: Array.isArray(payload.roles) ? payload.roles.filter((role): role is string => typeof role === 'string') : [] };
    return next();
  } catch {
    return next(new UnauthorizedError());
  }
}

function actor(request: Request): string {
  if (!request.user) throw new UnauthorizedError();
  return request.user.sub;
}

export function buildApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN }));
  app.use(express.json({ limit: '1mb' }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));

  app.get('/health', (_request, response) => response.json({ status: 'ok' }));
  app.post('/api/v1/auth/login', async (request, response, next) => {
    try {
      const input = loginSchema.parse(request.body);
      const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() }, include: { roles: { include: { role: true } } } });
      if (!user || !user.isActive || !(await bcrypt.compare(input.password, user.passwordHash))) throw new UnauthorizedError('Invalid credentials');
      const token = jwt.sign({ roles: user.roles.map((role) => role.role.name) }, env.JWT_SECRET, { subject: user.id, expiresIn: '8h' });
      return response.json({ accessToken: token, tokenType: 'Bearer' });
    } catch (error) { return next(error); }
  });

  const api = express.Router();
  api.use(authenticate);
  api.get('/clients', asyncRoute(async (request, response) => {
    const query = request.query as { status?: string; planId?: string; search?: string; limit?: string; offset?: string };
    return response.json(await listClients({ ...(query.status === undefined ? {} : { status: query.status }), ...(query.planId === undefined ? {} : { planId: query.planId }), ...(query.search === undefined ? {} : { search: query.search }), limit: Math.min(Number(query.limit ?? 200), 2000), offset: Number(query.offset ?? 0) }));
  }));
  api.get('/clients/:id', asyncRoute(async (request, response) => {
    return response.json(await getClient((request.params as { id: string }).id));
  }));
  api.post('/clients', asyncRoute(async (request, response) => {
    const input = createClientSchema.parse(request.body);
    return response.status(201).json(await createClient({ ...input, actorUserId: actor(request) }));
  }));
  api.put('/clients/:id', asyncRoute(async (request, response) => {
    const input = updateClientSchema.parse(request.body);
    return response.json(await updateClient((request.params as { id: string }).id, input, actor(request)));
  }));
  api.get('/payments', asyncRoute(async (request, response) => {
    const query = request.query as { clientId?: string; from?: string; to?: string; includeHistoric?: string; limit?: string; offset?: string };
    return response.json(await listPayments({ ...(query.clientId === undefined ? {} : { clientId: query.clientId }), ...(query.from === undefined ? {} : { from: query.from }), ...(query.to === undefined ? {} : { to: query.to }), ...(query.includeHistoric === undefined ? {} : { includeHistoric: query.includeHistoric === 'true' }), limit: Math.min(Number(query.limit ?? 100), 300), offset: Number(query.offset ?? 0) }));
  }));
  api.post('/subscriptions', async (request, response, next) => {
    try { const input = subscriptionSchema.parse(request.body); return response.status(201).json(await createSubscription({ clientId: input.clientId, planId: input.planId, startedOn: input.startedOn, months: input.months, ...(input.changeReason === undefined ? {} : { changeReason: input.changeReason }), actorUserId: actor(request) })); } catch (error) { return next(error); }
  });
  api.post('/payments', async (request, response, next) => {
    try { const input = paymentSchema.parse(request.body); return response.status(201).json(await recordPayment({ clientId: input.clientId, amount: input.amount, paidAt: input.paidAt, method: input.method, ...(input.reference === undefined ? {} : { reference: input.reference }), ...(input.idempotencyKey === undefined ? {} : { idempotencyKey: input.idempotencyKey }), actorUserId: actor(request) })); } catch (error) { return next(error); }
  });
  api.post('/clients/:id/deactivate', async (request, response, next) => { try { return response.json(await deactivateClient(request.params.id, actor(request))); } catch (error) { return next(error); } });
  api.post('/clients/:id/access-renewal', async (request, response, next) => { try { return response.json(await renewAccessCycle({ clientId: request.params.id, ...renewalSchema.parse(request.body), actorUserId: actor(request) })); } catch (error) { return next(error); } });
  api.get('/clients/:id/subscription', async (request, response, next) => { try { return response.json(await getClientSubscription((request.params as { id: string }).id)); } catch (error) { return next(error); } });
  api.get('/plans', async (_request, response, next) => { try { return response.json(await listPlans()); } catch (error) { return next(error); } });
  api.get('/plans/:id', async (request, response, next) => { try { return response.json(await getPlanDetail(request.params.id)); } catch (error) { return next(error); } });
  api.post('/plans', async (request, response, next) => {
    try {
      const input = planCreateSchema.parse(request.body);
      return response.status(201).json(await createPlan({
        name: input.name,
        price: input.price,
        ...(input.lessonsPerPeriod === undefined ? {} : { lessonsPerPeriod: input.lessonsPerPeriod }),
        ...(input.validityMonths === undefined ? {} : { validityMonths: input.validityMonths }),
        ...(input.isUnlimited === undefined ? {} : { isUnlimited: input.isUnlimited }),
        ...(input.usageRules === undefined ? {} : { usageRules: input.usageRules }),
      }));
    } catch (error) { return next(error); }
  });
  api.post('/units', async (request, response, next) => { try { const input = unitSchema.parse(request.body); return response.status(201).json(await createUnit({ name: input.name, code: input.code, ...(input.city === undefined ? {} : { city: input.city }), ...(input.province === undefined ? {} : { province: input.province }), ...(input.timezone === undefined ? {} : { timezone: input.timezone }), ...(input.currency === undefined ? {} : { currency: input.currency }), createdById: actor(request) })); } catch (error) { return next(error); } });
  api.get('/units', async (_request, response, next) => { try { return response.json(await listUnits()); } catch (error) { return next(error); } });
  api.post('/freezes', async (request, response, next) => { try { const input = freezeSchema.parse(request.body); return response.status(201).json(await freezeSubscription({ subscriptionId: input.subscriptionId, startsOn: input.startsOn, ...(input.endsOn === undefined ? {} : { endsOn: input.endsOn }), reason: input.reason, actorUserId: actor(request) })); } catch (error) { return next(error); } });
  api.post('/freezes/:id/unfreeze', async (request, response, next) => { try { return response.json(await unfreezeSubscription(request.params.id, actor(request))); } catch (error) { return next(error); } });
  api.post('/releases', async (request, response, next) => { try { return response.status(201).json(await releasePeriod({ ...releaseSchema.parse(request.body), actorUserId: actor(request) })); } catch (error) { return next(error); } });
  api.post('/attendances', async (request, response, next) => { try { return response.status(201).json(await recordAttendance({ ...attendanceSchema.parse(request.body), actorUserId: actor(request) })); } catch (error) { return next(error); } });
  api.post('/access-events', async (request, response, next) => { try { const input = accessSchema.parse(request.body); return response.status(201).json(await processAccess({ ...(input.clientId === undefined ? {} : { clientId: input.clientId }), ...(input.devicePin === undefined ? {} : { devicePin: input.devicePin }), ...(input.cardNumber === undefined ? {} : { cardNumber: input.cardNumber }), ...(input.terminalId === undefined ? {} : { terminalId: input.terminalId }), ...(input.externalEventId === undefined ? {} : { externalEventId: input.externalEventId }), occurredAt: input.occurredAt, type: input.type, source: input.source, ...(input.rawPayload === undefined ? {} : { rawPayload: input.rawPayload as Prisma.InputJsonObject }) })); } catch (error) { return next(error); } });
  api.get('/access-events', async (request, response, next) => { try { const query = request.query as { clientId?: string; unitId?: string; from?: string; to?: string; limit?: string; offset?: string }; return response.json(await listAccessEvents({ ...(query.clientId === undefined ? {} : { clientId: query.clientId }), ...(query.unitId === undefined ? {} : { unitId: query.unitId }), ...(query.from === undefined ? {} : { from: query.from }), ...(query.to === undefined ? {} : { to: query.to }), limit: Math.min(Number(query.limit ?? 100), 500), offset: Number(query.offset ?? 0) })); } catch (error) { return next(error); } });
  api.post('/terminals', async (request, response, next) => { try { const input = terminalSchema.parse(request.body); return response.status(201).json(await registerTerminal({ unitId: input.unitId, name: input.name, serialNumber: input.serialNumber, type: input.type, ...(input.model === undefined ? {} : { model: input.model }), ...(input.ipAddress === undefined ? {} : { ipAddress: input.ipAddress }), ...(input.port === undefined ? {} : { port: input.port }), ...(input.communicationKey === undefined ? {} : { communicationKey: input.communicationKey }) })); } catch (error) { return next(error); } });
  api.get('/terminals', async (request, response, next) => { try { return response.json(await listTerminals((request.query as { unitId?: string }).unitId)); } catch (error) { return next(error); } });
  api.get('/clients/:id/last-attendance', async (request, response, next) => { try { return response.json(await getLastAttendance(request.params.id)); } catch (error) { return next(error); } });
  api.get('/dashboard', async (request, response, next) => {
    try { const query = request.query as { year?: string; month?: string }; return response.json(await getDashboard(Number(query.year ?? new Date().getUTCFullYear()), query.month === undefined ? undefined : Number(query.month))); } catch (error) { return next(error); }
  });
  api.post('/source-sync/run', async (_request, response, next) => { try { return response.json(await syncFromSource()); } catch (error) { return next(error); } });
  app.use('/api/v1', api);

  app.use((error: unknown, request: Request, response: Response, _next: NextFunction) => {
    if (error instanceof DomainError) return response.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    if (error instanceof z.ZodError) return response.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error.issues.map((issue) => issue.message).join('; ') } });
    console.error({ error, method: request.method, path: request.path }, 'Unhandled request error');
    return response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });
  return app;
}
