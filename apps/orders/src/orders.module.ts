import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import * as Joi from 'joi';

import { OrderDocument, OrderSchema } from './schemas/order.schema';
import { CartDocument, CartSchema } from './schemas/cart.schema';
import { OrdersController } from './orders.controller';
import { CartController } from './cart.controller';
import { OrdersService } from './orders.service';
import { CartService } from './cart.service';
import { OrdersRepository } from './orders.repository';
import { CartRepository } from './cart.repository';
import { HealthModule } from '@app/common';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/orders/.env',
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        HTTP_PORT: Joi.number().default(3003),
        AUTH_HTTP_BASEURL: Joi.string().required(),
      }),
    }),
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get('AUTH_HTTP_BASEURL'),
        timeout: 5000,
        maxRedirects: 2,
      }),
      inject: [ConfigService],
    }),

    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: OrderDocument.name, schema: OrderSchema },
      { name: CartDocument.name, schema: CartSchema },
    ]),
    HealthModule,
  ],
  controllers: [OrdersController, CartController],
  providers: [
    OrdersService,
    OrdersRepository,
    CartService,
    CartRepository,
    Reflector,
  ],
  exports: [HttpModule],
})
export class OrdersModule {}
