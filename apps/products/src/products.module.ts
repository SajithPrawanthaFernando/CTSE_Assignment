import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios'; // Import this
import * as Joi from 'joi';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ProductDocument, ProductSchema } from './schemas/product.schema';
import { HealthModule } from '@app/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'apps/products/.env'],
      validationSchema: Joi.object({
        PORT: Joi.number().default(3002),
        MONGODB_URI: Joi.string().required(),
        AUTH_HTTP_BASEURL: Joi.string().required(),
      }),
    }),

    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get('AUTH_HTTP_BASEURL'),
        timeout: 5000,
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.get('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: ProductDocument.name, schema: ProductSchema },
    ]),
    HealthModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService, HttpModule],
})
export class ProductsModule {}
