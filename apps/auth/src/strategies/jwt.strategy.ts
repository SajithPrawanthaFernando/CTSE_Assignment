// apps/api-gateway/src/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1. Try Authorization: Bearer header FIRST
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // 2. Fallback to cookie
        (request: any) =>
          request?.cookies?.Authentication ||
          request?.headers?.authentication || // ← lowercase
          null,
      ]),
      secretOrKey: configService.get<string>('JWT_SECRET'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    return payload;
  }
}