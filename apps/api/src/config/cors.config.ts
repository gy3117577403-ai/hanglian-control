import type { Logger } from '@nestjs/common';

function splitCsv(value?: string) {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function envBool(name: string, fallback: boolean) {
  const value = process.env[name];
  if (!value) return fallback;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
}

function isHttpOrigin(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function isForbiddenOriginValue(value: string) {
  const lowered = value.toLowerCase();
  return lowered.includes('postgresql://')
    || lowered.includes('database_url')
    || lowered.includes('s3_secret')
    || lowered.includes('secret=')
    || lowered.includes('password=');
}

function isLocalDevelopmentOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return true;
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(url.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

export function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS;
  const fallback = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173,http://localhost:5174';
  return splitCsv(raw ?? fallback)
    .filter((origin) => isHttpOrigin(origin))
    .filter((origin) => !isForbiddenOriginValue(origin));
}

export function buildCorsOptions(logger: Logger) {
  const origins = parseCorsOrigins();
  const credentials = envBool('CORS_ALLOW_CREDENTIALS', false);
  const production = process.env.NODE_ENV === 'production';

  if (production && !process.env.CORS_ORIGINS) {
    logger.warn('CORS_ORIGINS is not configured in production. Browser access requires an explicit origin allowlist.');
  }

  return {
    credentials,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-mock-user-id'],
    origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (origins.includes(origin)) {
        callback(null, true);
        return;
      }
      if (!production && isLocalDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    optionsSuccessStatus: 204,
  };
}
