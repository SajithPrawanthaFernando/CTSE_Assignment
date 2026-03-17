import { NestFactory } from '@nestjs/core';
import { ProductsModule } from './products.module';

async function bootstrap() {
  const app = await NestFactory.create(ProductsModule);
  const port = process.env.HTTP_PORT ? Number(process.env.HTTP_PORT) : 3002;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
