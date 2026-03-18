import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
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
import { JwtStrategy } from './strategies/jwt.strategy';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './apps/orders/.env',
      validationSchema: Joi.object({
        MONGODB_URI: Joi.string().required(),
        HTTP_PORT: Joi.number().default(3003),
        PRODUCTS_HTTP_BASEURL: Joi.string().uri().optional(),
        JWT_SECRET: Joi.string().required(), // ← added
      }),
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({                // ← added
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
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
    JwtStrategy,
    RolesGuard,  
    Reflector, 
  ], // ← added JwtStrategy
})
export class OrdersModule {}