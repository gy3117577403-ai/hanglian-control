import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'dotenv';

export function getApiRootDir() {
  return resolve(__dirname, '../..');
}

export function getApiEnvPath() {
  return join(getApiRootDir(), '.env');
}

export function getApiEnvLocalPath() {
  return join(getApiRootDir(), '.env.local');
}

export function hasApiEnvLocal() {
  return existsSync(getApiEnvLocalPath());
}

export function loadApiEnvironmentFiles() {
  const originalKeys = new Set(Object.keys(process.env));
  const envPath = getApiEnvPath();
  const envLocalPath = getApiEnvLocalPath();

  if (existsSync(envPath)) {
    const parsed = parse(readFileSync(envPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  }

  if (existsSync(envLocalPath)) {
    const parsed = parse(readFileSync(envLocalPath, 'utf8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (!originalKeys.has(key)) {
        process.env[key] = value;
      }
    }
  }

  return {
    envPath,
    envLocalPath,
    envLocalExists: existsSync(envLocalPath),
  };
}
