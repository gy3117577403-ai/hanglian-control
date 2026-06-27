import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import express, { type NextFunction, type Request, type Response } from 'express';
import { existsSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { AppModule } from './app.module';
import { buildCorsOptions } from './config/cors.config';

function getLanIpv4List() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

function normalizeApiPrefix(apiPrefix: string) {
  return `/${apiPrefix.replace(/^\/+|\/+$/g, '') || 'api'}`;
}

function isApiRequest(pathname: string, apiPrefix: string) {
  const normalizedPrefix = normalizeApiPrefix(apiPrefix);
  return pathname === normalizedPrefix || pathname.startsWith(`${normalizedPrefix}/`);
}

function findTabletDistRoot() {
  const candidates = [
    process.env.TABLET_DIST_ROOT,
    resolve(process.cwd(), 'apps/tablet/dist'),
    resolve(process.cwd(), '../tablet/dist'),
    resolve(__dirname, '../../tablet/dist'),
    resolve(__dirname, '../../../../tablet/dist'),
    resolve(process.cwd(), 'public/tablet'),
  ].filter((candidate): candidate is string => Boolean(candidate));

  return candidates.find((candidate) => existsSync(join(candidate, 'index.html')));
}

function buildRuntimeConfigScript() {
  return [
    'window.__HANGLIAN_RUNTIME_CONFIG__ = {',
    '  API_BASE_URL: "/api",',
    '  APP_ENV: "production",',
    '  STORAGE_MODE: "local"',
    '};',
    'window.__HANG_LIAN_CONFIG__ = {',
    '  apiBaseUrl: "/api"',
    '};',
    '',
  ].join('\n');
}

function configureTabletWebEntry(app: Awaited<ReturnType<typeof NestFactory.create>>, apiPrefix: string, logger: Logger) {
  const tabletDistRoot = findTabletDistRoot();
  if (!tabletDistRoot) {
    logger.warn('Tablet Web entry disabled: tablet dist index.html was not found.');
    return;
  }

  const runtimeConfigScript = buildRuntimeConfigScript();
  const indexHtmlPath = join(tabletDistRoot, 'index.html');

  app.use('/runtime-config.js', (request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();
    response
      .type('application/javascript; charset=utf-8')
      .setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return response.send(runtimeConfigScript);
  });

  app.use(
    express.static(tabletDistRoot, {
      index: false,
      fallthrough: true,
      maxAge: '30d',
      immutable: true,
      setHeaders(response, path) {
        if (path.endsWith('index.html') || path.endsWith('sw.js')) {
          response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      },
    }),
  );

  app.use((request: Request, response: Response, next: NextFunction) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') return next();
    if (isApiRequest(request.path, apiPrefix)) return next();
    if (request.path === '/runtime-config.js') return next();
    if (extname(request.path)) return next();

    response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return response.sendFile(indexHtmlPath);
  });

  logger.log(`Tablet Web entry enabled from ${tabletDistRoot}`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HanglianApi');
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  app.enableCors(buildCorsOptions(logger));
  app.setGlobalPrefix(apiPrefix);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('线束车间生产计划资料管控系统 Mock API')
    .setDescription('Mock Repository API，不连接真实数据库、企业微信微盘或语音平台。')
    .setVersion('1.5.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  configureTabletWebEntry(app, apiPrefix, logger);

  await app.listen(port, host);

  logger.log(`Local API: http://localhost:${port}/${apiPrefix}`);
  const lanIps = getLanIpv4List();
  if (lanIps.length) {
    for (const ip of lanIps) {
      logger.log(`LAN API: http://${ip}:${port}/${apiPrefix}`);
      logger.log(`LAN Swagger: http://${ip}:${port}/${apiPrefix}/docs`);
    }
  } else {
    logger.warn('LAN API: 请使用 ipconfig 查看本机 IPv4 地址。');
  }
}

void bootstrap();
