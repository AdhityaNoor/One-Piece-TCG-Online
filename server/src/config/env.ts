/**
 * Single source of truth for backend configuration. Everything comes from
 * environment variables (project rule: "Use environment variables only. Do
 * not hardcode secrets."). Loaded once at boot; missing required secrets
 * fail fast with a clear message rather than surfacing as a confusing
 * runtime error later.
 *
 * Cloud Run injects PORT automatically and expects the process to bind it on
 * 0.0.0.0 — see src/index.ts.
 */
import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Set it in your .env (local) or Cloud Run service config (prod). See server/.env.example.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

/**
 * CLIENT_ORIGIN may be a comma-separated list so a single deploy can allow
 * both the Vercel production domain and a preview/localhost origin.
 */
function parseOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

export interface AppEnv {
  nodeEnv: string;
  isProd: boolean;
  port: number;
  mongoUri: string;
  jwtSecret: string;
  /** Allowed browser origins for CORS + WebSocket. */
  clientOrigins: string[];
  /** Token lifetime; short-ish by default, refreshed by re-login. */
  jwtExpiresIn: string;
}

export function loadEnv(): AppEnv {
  const nodeEnv = optional('NODE_ENV', 'development');
  return {
    nodeEnv,
    isProd: nodeEnv === 'production',
    // Cloud Run always provides PORT; default 8080 matches its convention.
    port: Number(optional('PORT', '8080')),
    mongoUri: required('MONGODB_URI'),
    jwtSecret: required('JWT_SECRET'),
    clientOrigins: parseOrigins(optional('CLIENT_ORIGIN', 'http://localhost:5173')),
    jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),
  };
}

/** Eagerly-loaded singleton for the rest of the app to import. */
export const env: AppEnv = loadEnv();
