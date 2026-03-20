import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { AUTH_SERVICE } from '../constants/services';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(@Inject(AUTH_SERVICE) private readonly authClient: ClientProxy) {}

  canActivate(context: ExecutionContext): Observable<boolean> {
    const request = context.switchToHttp().getRequest();

    const jwt =
      request.cookies?.Authentication ||
      request.headers?.authentication ||
      request.headers?.authorization?.split(' ')[1];

    if (!jwt) {
      this.logger.error('No JWT found in request headers or cookies');
      return of(false);
    }

    this.logger.debug(`JWT found, validating with Auth Microservice: ${jwt}`);

    return this.authClient
      .send('authenticate', {
        Authentication: jwt,
      })
      .pipe(
        tap((res) => {
          request.user = res;
        }),
        map(() => true),
        catchError((err) => {
          this.logger.error('Auth microservice rejected the token');
          return of(false);
        }),
      );
  }
}
