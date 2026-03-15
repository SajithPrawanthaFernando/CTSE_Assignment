import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ExceptionFilter, Catch, ArgumentsHost, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ProductsModule } from './products.module';

@Catch()
class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception && typeof (exception as any).getStatus === 'function'
      ? (exception as any).getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const message = exception instanceof Error ? exception.message : 'Internal server error';

    this.logger.error(`${req.method} ${req.url} → ${status}: ${message}`);
    if (exception instanceof Error && exception.stack) {
      this.logger.debug(exception.stack);
    }

    res.status(status).json({
      statusCode: status,
      message,
      error: status === 500 ? 'Check server logs; often caused by MongoDB not running or wrong MONGODB_URI.' : undefined,
    });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(ProductsModule);
  const configService = app.get(ConfigService);

  app.useGlobalFilters(new AllExceptionsFilter());

  app.enableCors({
    origin: true, // restrict in production
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Product Catalog API')
    .setDescription(
      'Product Catalog microservice for the e-commerce application. ' +
        '**Integration:** Orders service can call GET /products/bulk?ids=... to resolve product details.',
    )
    .setVersion('1.0')
    .addTag('products')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('PORT') ?? 3002;
  await app.listen(port);
  console.log(`Product Catalog service listening on http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api`);
}
bootstrap();
