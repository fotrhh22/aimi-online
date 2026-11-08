import { config as dotenv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
dotenv({ path: fileURLToPath(new URL('../.env.local', import.meta.url)), quiet: true });
const Schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'), PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  DATABASE_URL: z.string().url().refine(v => /^postgres(ql)?:/.test(v)),
  SESSION_SIGNING_KEY: z.string().min(32),
  CORS_ALLOWED_ORIGINS: z.string().default('http://127.0.0.1:5180,http://localhost:5180'),
  ENABLE_DEV_AUTH: z.enum(['true', 'false']).default('false'),
  LOG_LEVEL: z.enum(['fatal','error','warn','info','debug','trace','silent']).default('info'),
});
export type Config = z.infer<typeof Schema>;
export function parseConfig(env: Record<string, string | undefined>): Config {
  const result = Schema.safeParse(env);
  if (!result.success) throw new Error('Invalid configuration fields: ' + result.error.issues.map(i => i.path.join('.')).join(', '));
  const c = result.data;
  if (c.ENABLE_DEV_AUTH === 'true' && (c.NODE_ENV === 'production' || env.RENDER || !['127.0.0.1','localhost','::1'].includes(c.HOST))) throw new Error('Development auth requires local loopback and a non-production environment');
  return c;
}
