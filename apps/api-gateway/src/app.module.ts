import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { UsersProxyController } from './users-proxy.controller';
import { AuthProxyController } from './auth-proxy.controller';
import { ProductsProxyController } from './products-proxy.controller';
import { JwtStrategy } from '../../auth/src/strategies/jwt.strategy';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api-gateway/.env', '.env'],
      load: [
        () => ({
          AUTH_HTTP_BASEURL: process.env.AUTH_HTTP_BASEURL || 'http://localhost:3001',
          PRODUCTS_HTTP_BASEURL: process.env.PRODUCTS_HTTP_BASEURL || 'http://localhost:3002',
          GATEWAY_HTTP_PORT: process.env.GATEWAY_HTTP_PORT || 3009,
        }),
      ],
    }),
    HttpModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRATION') ?? '3600s',
        },
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
  ],
  controllers: [AuthProxyController, UsersProxyController, ProductsProxyController],
  providers: [
    JwtStrategy,  // ← lightweight gateway strategy, no UsersService needed
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}