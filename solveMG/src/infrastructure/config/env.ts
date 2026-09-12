import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  APP_TIMEZONE: z.string().default('Africa/Luanda'),
  SOURCE_DATABASE_URL: z.string().url().optional(),
  SOURCE_DATABASE_SCHEMA: z.string().default('public'),
  SOURCE_SYNC_INTERVAL_SECONDS: z.coerce.number().int().positive().default(30),
  SOURCE_SYNC_BATCH_SIZE: z.coerce.number().int().positive().max(5000).default(500),
  SOURCE_SYNC_ACTOR_USER_ID: z.string().uuid().optional(),
  CORS_ORIGIN: z.string().default('*'),
  CRM_WEBHOOK_URL: z.url().optional().or(z.literal('')),
  OVG_WEBHOOK_URL: z.url().optional().or(z.literal('')),
});

export const env = schema.parse(process.env);