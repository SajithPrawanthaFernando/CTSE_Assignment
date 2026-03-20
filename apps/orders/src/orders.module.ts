import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ClientsModule, Transport } from '@nestjs/microservices';
import * as Joi from 'joi';

import { OrderDocument, OrderSchema } from './schemas/order.schema';
import { CartDocument, CartSchema } from './schemas/cart.schema';
import { OrdersController } from './orders.controller';
import { CartController } from './cart.controller';
import { OrdersService } from './orders.service';
import { CartService } from './cart.service';
import { OrdersRepository } from './orders.repository';
import { CartRepository } from './cart.repository';
import { HealthModule, AUTH_SERVICE } from '@app/common';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/orders/.env',
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        HTTP_PORT: Joi.number().default(3003),
        JWT_SECRET: Joi.string().required(),
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: '127.0.0.1',
            port: Number(configService.get('AUTH_PORT')),
          },
        }),
        inject: [ConfigService],
      },
    ]),
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
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 2,
    }),
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
})
export class OrdersModule {}
