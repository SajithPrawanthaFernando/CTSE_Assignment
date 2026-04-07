import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';
import { NotificationsModule } from './notifications.module';
import * as cookieParser from 'cookie-parser'; // 👈 1. IMPORT THIS

async function bootstrap() {
  const app = await NestFactory.create(NotificationsModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser()); 

  const tcpPort = configService.get('TCP_PORT') || 3011;
  const httpPort = configService.get('HTTP_PORT') || 3010;

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: '0.0.0.0',
      port: tcpPort,
    },
  });

  app.useLogger(app.get(Logger));

  await app.startAllMicroservices();

  await app.listen(httpPort);

  console.log(`🚀 Notification Service (HTTP) is running on: ${httpPort}`);
  console.log(`🔌 Notification Service (TCP) is running on: ${tcpPort}`);
}
bootstrap();