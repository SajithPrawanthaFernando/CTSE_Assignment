import { Controller, Get, Headers, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser, UserDocument } from '@app/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(
    @CurrentUser() user: UserDocument,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(user, response);
    return result;
  }

  @Get('authenticate')
  async authenticate(@Headers('authentication') authHeader: string) {
    return this.authService.validateToken(authHeader);
  }

  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Res({ passthrough: true }) response: Response) {
    return this.authService.logout(response);
  }
}
