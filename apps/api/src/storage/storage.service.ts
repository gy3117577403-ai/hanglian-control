import { BadRequestException, Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { dirname, extname, join, resolve } from 'node:path';
import type { IncomingMessage, OutgoingHttpHeaders } from 'node:http';
import { LocalStorageService } from './local-storage.service';
import type { SaveFileResult, StorageProviderName, StoredFileReference, StoredFileStream } from './storage.types';

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MIME_TYPES_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

interface S3Config {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  forcePathStyle: boolean;
  objectPrefix: string;
}

interface S3RequestResult {
  headers: IncomingMessage['headers'];
  stream?: IncomingMessage;
}

function env(name: string, fallback = '') {
  const value = process.env[name];
  return value === undefined || value === null || value === '' ? fallback : value;
}

function envBool(name: string, fallback: boolean) {
  const value = process.env[name];
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function hashSha256(value: Buffer | string) {
  return createHash('sha256').update(value).digest('hex');
}

function hmac(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest();
}

function hmacHex(key: Buffer | string, value: string) {
  return createHmac('sha256', key).update(value).digest('hex');
}

function amzDateParts(now = new Date()) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return {
    amzDate: iso,
    dateStamp: iso.slice(0, 8),
  };
}

function encodePathPart(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function normalizeS3Key(value: string) {
  return value.replace(/\\/g, '/').replace(/^\/+/, '');
}

@Injectable()
export class StorageService {
  constructor(private readonly localStorageService: LocalStorageService) {}

  get activeProvider(): StorageProviderName {
    return this.s3Config() ? 's3' : 'local';
  }

  async saveFile(file: Express.Multer.File, mimeType = file.mimetype): Promise<SaveFileResult> {
    if (!file.buffer) throw new BadRequestException('Uploaded file buffer is missing.');

    const storageKey = this.createStorageKey(file.originalname, mimeType);
    const checksumSha256 = hashSha256(file.buffer);
    const s3 = this.s3Config();

    if (s3) {
      const s3Key = this.withS3Prefix(s3, storageKey);
      await this.putS3Object(s3, s3Key, file.buffer, mimeType);
      return {
        provider: 's3',
        storageKey: s3Key,
        storedFileName: s3Key,
        originalFileName: file.originalname,
        mimeType,
        fileSize: file.size,
        checksumSha256,
      };
    }

    await this.localStorageService.ensureStorage();
    const safeKey = this.assertSafeStorageKey(storageKey);
    const absolutePath = this.localPathForKey(safeKey);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, file.buffer);
    return {
      provider: 'local',
      storageKey: safeKey,
      storedFileName: safeKey,
      originalFileName: file.originalname,
      mimeType,
      fileSize: file.size,
      checksumSha256,
    };
  }

  async getFileStream(reference: StoredFileReference): Promise<StoredFileStream | undefined> {
    const storageKey = reference.storageKey ?? reference.storedFileName;
    if (!storageKey) return undefined;

    const provider = reference.provider === 's3' ? 's3' : 'local';
    if (provider === 's3') {
      const s3 = this.s3Config();
      if (!s3) return undefined;
      const response = await this.getS3Object(s3, storageKey);
      if (!response.stream) return undefined;
      return {
        provider: 's3',
        storageKey,
        stream: response.stream,
        mimeType: String(response.headers['content-type'] ?? reference.mimeType ?? 'application/octet-stream'),
        fileSize: Number(response.headers['content-length'] ?? reference.fileSize ?? 0),
      };
    }

    const safeKey = this.assertSafeStorageKey(storageKey);
    const absolutePath = this.localPathForKey(safeKey);
    try {
      const fileStat = await stat(absolutePath);
      if (!fileStat.isFile()) return undefined;
      return {
        provider: 'local',
        storageKey: safeKey,
        stream: createReadStream(absolutePath),
        mimeType: reference.mimeType ?? MIME_TYPES_BY_EXTENSION[extname(safeKey).toLowerCase()] ?? 'application/octet-stream',
        fileSize: reference.fileSize ?? fileStat.size,
      };
    } catch {
      return undefined;
    }
  }

  async deleteFile(reference: StoredFileReference) {
    const storageKey = reference.storageKey ?? reference.storedFileName;
    if (!storageKey) return { deleted: false, reason: 'missing_storage_key' };

    const provider = reference.provider === 's3' ? 's3' : 'local';
    if (provider === 's3') {
      const s3 = this.s3Config();
      if (!s3) return { deleted: false, reason: 's3_not_configured' };
      await this.deleteS3Object(s3, storageKey);
      return { deleted: true, reason: 'deleted' };
    }

    try {
      await rm(this.localPathForKey(this.assertSafeStorageKey(storageKey)));
      return { deleted: true, reason: 'deleted' };
    } catch {
      return { deleted: false, reason: 'file_not_found' };
    }
  }

  private s3Config(): S3Config | undefined {
    const region = env('S3_REGION', env('AWS_REGION', 'us-east-1'));
    const endpointFromEnv = env('S3_ENDPOINT', env('AWS_S3_ENDPOINT'));
    const endpoint = endpointFromEnv || `https://s3.${region}.amazonaws.com`;
    const bucket = env('S3_BUCKET', env('AWS_S3_BUCKET'));
    const accessKeyId = env('S3_ACCESS_KEY_ID', env('AWS_ACCESS_KEY_ID'));
    const secretAccessKey = env('S3_SECRET_ACCESS_KEY', env('AWS_SECRET_ACCESS_KEY'));
    if (!bucket || !accessKeyId || !secretAccessKey) return undefined;

    return {
      endpoint,
      region,
      bucket,
      accessKeyId,
      secretAccessKey,
      sessionToken: env('S3_SESSION_TOKEN', env('AWS_SESSION_TOKEN')) || undefined,
      forcePathStyle: envBool('S3_FORCE_PATH_STYLE', Boolean(endpointFromEnv)),
      objectPrefix: env('S3_OBJECT_PREFIX', env('S3_PREFIX', 'documents')).replace(/^\/+|\/+$/g, '') || 'documents',
    };
  }

  private createStorageKey(originalName: string, mimeType: string) {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const extension = MIME_EXTENSIONS[mimeType] ?? this.safeExtension(originalName);
    return `documents/${year}/${month}/${randomUUID()}${extension}`;
  }

  private safeExtension(originalName: string) {
    const extension = extname(originalName).toLowerCase();
    return /^\.[a-z0-9]{1,12}$/.test(extension) ? extension : '.bin';
  }

  private assertSafeStorageKey(key: string) {
    const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized || normalized.includes('..') || normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
      throw new BadRequestException('Unsafe storage key.');
    }
    if (!/^[a-zA-Z0-9._/-]+$/.test(normalized)) {
      throw new BadRequestException('Storage key contains unsupported characters.');
    }
    return normalized;
  }

  private localPathForKey(key: string) {
    const root = resolve(this.localStorageService.getUploadsDir());
    const target = resolve(root, key);
    if (target !== root && !target.startsWith(`${root}\\`) && !target.startsWith(`${root}/`)) {
      throw new BadRequestException('Unsafe storage path.');
    }
    return target;
  }

  private withS3Prefix(config: S3Config, key: string) {
    const safeKey = this.assertSafeStorageKey(key);
    if (safeKey === config.objectPrefix || safeKey.startsWith(`${config.objectPrefix}/`)) {
      return normalizeS3Key(safeKey);
    }
    return normalizeS3Key(`${config.objectPrefix}/${safeKey}`);
  }

  private async putS3Object(config: S3Config, key: string, body: Buffer, mimeType: string) {
    await this.s3Request(config, 'PUT', key, body, {
      'content-type': mimeType,
      'content-length': String(body.length),
    });
  }

  private async getS3Object(config: S3Config, key: string) {
    return this.s3Request(config, 'GET', key, undefined, {}, true);
  }

  private async deleteS3Object(config: S3Config, key: string) {
    await this.s3Request(config, 'DELETE', key);
  }

  private s3Url(config: S3Config, key: string) {
    const endpoint = new URL(config.endpoint);
    const keyPath = normalizeS3Key(key).split('/').map(encodePathPart).join('/');
    const basePath = endpoint.pathname.replace(/\/+$/g, '');

    if (config.forcePathStyle) {
      endpoint.pathname = `${basePath}/${encodePathPart(config.bucket)}/${keyPath}`;
      return endpoint;
    }

    endpoint.hostname = `${config.bucket}.${endpoint.hostname}`;
    endpoint.pathname = `${basePath}/${keyPath}`;
    return endpoint;
  }

  private async s3Request(
    config: S3Config,
    method: 'PUT' | 'GET' | 'DELETE',
    key: string,
    body: Buffer = Buffer.alloc(0),
    extraHeaders: OutgoingHttpHeaders = {},
    streamResponse = false,
  ): Promise<S3RequestResult> {
    const url = this.s3Url(config, key);
    const bodyHash = hashSha256(body);
    const signedHeaders = this.signS3Request(config, method, url, bodyHash, extraHeaders);
    const request = url.protocol === 'http:' ? httpRequest : httpsRequest;

    return new Promise((resolvePromise, reject) => {
      const req = request(url, { method, headers: signedHeaders }, (res) => {
        const statusCode = res.statusCode ?? 0;
        if (statusCode >= 200 && statusCode < 300) {
          if (streamResponse) {
            resolvePromise({ headers: res.headers, stream: res });
            return;
          }
          res.resume();
          res.on('end', () => resolvePromise({ headers: res.headers }));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const message = Buffer.concat(chunks).toString('utf8') || res.statusMessage || 'S3 request failed.';
          reject(new Error(`S3 ${method} ${key} failed with ${statusCode}: ${message}`));
        });
      });

      req.on('error', reject);
      if (body.length > 0) req.write(body);
      req.end();
    });
  }

  private signS3Request(
    config: S3Config,
    method: string,
    url: URL,
    payloadHash: string,
    extraHeaders: OutgoingHttpHeaders,
  ) {
    const { amzDate, dateStamp } = amzDateParts();
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    if (config.sessionToken) headers['x-amz-security-token'] = config.sessionToken;
    for (const [key, value] of Object.entries(extraHeaders)) {
      if (value === undefined) continue;
      headers[key.toLowerCase()] = Array.isArray(value) ? value.join(',') : String(value);
    }

    const sortedHeaderNames = Object.keys(headers).sort();
    const canonicalHeaders = sortedHeaderNames
      .map((name) => `${name}:${headers[name].trim().replace(/\s+/g, ' ')}\n`)
      .join('');
    const signedHeaders = sortedHeaderNames.join(';');
    const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
    const canonicalRequest = [
      method,
      url.pathname || '/',
      url.searchParams.toString(),
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      hashSha256(canonicalRequest),
    ].join('\n');
    const signingKey = this.signatureKey(config.secretAccessKey, dateStamp, config.region);
    const signature = hmacHex(signingKey, stringToSign);

    return {
      ...headers,
      authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    };
  }

  private signatureKey(secretAccessKey: string, dateStamp: string, region: string) {
    const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
    const dateRegionKey = hmac(dateKey, region);
    const dateRegionServiceKey = hmac(dateRegionKey, 's3');
    return hmac(dateRegionServiceKey, 'aws4_request');
  }
}
