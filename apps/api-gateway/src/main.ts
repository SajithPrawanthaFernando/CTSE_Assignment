import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { Logger } from '@nestjs/common';
import * as dotenv from 'dotenv';

// Load .env before anything else
dotenv.config({ path: 'apps/api-gateway/.env' });

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:4200'],
    credentials: true,
  });

  app.use(cookieParser());

  const port = process.env.GATEWAY_HTTP_PORT ?? 3009;
  await app.listen(port, '0.0.0.0');
  Logger.log(`API Gateway running on http://localhost:${port}`);

  return app;
}

if (require.main === module) {
  bootstrap();
}