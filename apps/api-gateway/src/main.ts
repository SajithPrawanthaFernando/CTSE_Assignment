import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';

export async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  app.use(cookieParser());

  await app.listen(process.env.GATEWAY_HTTP_PORT || 3000, '0.0.0.0');

  return app;
}

if (require.main === module) {
  bootstrap();
}
