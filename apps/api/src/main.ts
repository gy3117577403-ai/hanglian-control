import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, ValidationPipe } from '@nestjs/common';
import { networkInterfaces } from 'node:os';
import { AppModule } from './app.module';

function getLanIpv4List() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.family === 'IPv4' && !item.internal)
    .map((item) => item.address);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('HanglianApi');
  const apiPrefix = process.env.API_PREFIX ?? 'api';
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';

  app.enableCors();
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
