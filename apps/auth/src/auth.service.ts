import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserDocument } from '@app/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import { TokenPayload } from './interfaces/token-payload.interface';
import { UsersService } from './users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(user: UserDocument, response: Response) {
    const tokenPayload: TokenPayload = {
      userId: String(user._id),
      email: user.email,
      roles: user.roles,
    };

    const jwtExpiration = Number(this.configService.get('JWT_EXPIRATION'));

    const expires = new Date();
    expires.setSeconds(expires.getSeconds() + jwtExpiration);

    const token = this.jwtService.sign(tokenPayload);

    response.cookie('Authentication', token, {
      httpOnly: true,
      expires,
    });

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        roles: user.roles,
        fullname: user.fullname,
        phone: user.phone,
        address: user.address,
        firstname: user.firstname,
        lastname: user.lastname,
      },
    };
  }

  async validateToken(token: string) {
    try {
      if (!token) {
        this.logger.error('No token received in validateToken');
        throw new Error('No token provided');
      }

      this.logger.log(`Validating token: ${token.substring(0, 10)}...`);

      const payload: TokenPayload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      this.logger.log(`Token verified for userId: ${payload.userId}`);

      const user = await this.usersService.getUser({ _id: payload.userId });
      if (!user) {
        this.logger.error(`User not found for ID: ${payload.userId}`);
        throw new Error('User not found');
      }

      return user;
    } catch (err) {
      this.logger.error(`JWT Verification Failed: ${(err as Error).message}`);
      throw err;
    }
  }

  async logout(response: Response) {
    response.clearCookie('Authentication');
    return { message: 'Logged out successfully' };
  }
}
