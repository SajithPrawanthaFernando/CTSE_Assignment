import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { OrdersModule } from './orders.module';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(OrdersModule);
  const configService = app.get(ConfigService);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:4200',
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Orders Service API')
    .setDescription(
      'Order management microservice. Integrates with Products service for validation and pricing.',
    )
    .setVersion('1.0')
    .addTag('orders')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = Number(configService.get('HTTP_PORT')) || 3003;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
