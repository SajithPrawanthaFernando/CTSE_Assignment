// apps/api-gateway/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { UsersProxyController } from './users-proxy.controller';
import { AuthProxyController } from './auth-proxy.controller';
import { ProductsProxyController } from './products-proxy.controller';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// ← Lightweight gateway JWT strategy defined inline — no UsersService needed
@Injectable()
export class GatewayJwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) =>
          request?.cookies?.Authentication ||
          request?.headers?.authentication ||
          null,
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback-secret',
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    return payload;
  }
}

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
    GatewayJwtStrategy, // ← use inline strategy, not auth service's JwtStrategy
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}