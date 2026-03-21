import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const jwt =
      request.cookies?.Authentication || request.headers?.authentication;

    if (!jwt) return false;

    try {
      const authBaseUrl = this.configService.get('AUTH_HTTP_BASEURL');

      if (!authBaseUrl) {
        throw new Error(
          'AUTH_HTTP_BASEURL is not defined in environment variables',
        );
      }

      const { data: user } = await lastValueFrom(
        this.httpService.get(`${authBaseUrl}/auth/authenticate`, {
          headers: { authentication: jwt },
        }),
      );

      request.user = user;
      return true;
    } catch (err) {
      this.logger.error(
        `Auth service rejected token: ${(err as Error).message}`,
      );
      return false;
    }
  }
}
