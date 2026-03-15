import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { UsersProxyController } from './users-proxy.controller';
import { AuthProxyController } from './auth-proxy.controller';
import { ProductsProxyController } from './products-proxy.controller';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api-gateway/.env', '.env'],
      // Defaults so axios never gets "undefined" URL when .env is missing
      load: [
        () => ({
          AUTH_HTTP_BASEURL: process.env.AUTH_HTTP_BASEURL || 'http://localhost:3001',
          PRODUCTS_HTTP_BASEURL: process.env.PRODUCTS_HTTP_BASEURL || 'http://localhost:3002',
          GATEWAY_HTTP_PORT: process.env.GATEWAY_HTTP_PORT || 3000,
        }),
      ],
    }),
    HttpModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),
  ],
  controllers: [AuthProxyController, UsersProxyController, ProductsProxyController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
