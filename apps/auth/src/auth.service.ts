import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserDocument } from "@app/common";
import { JwtService } from "@nestjs/jwt";
import { Response } from "express";
import { TokenPayload } from "./interfaces/token-payload.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(user: UserDocument, response: Response) {
    const tokenPayload: TokenPayload = {
      userId: user._id.toHexString(),
      email: user.email,
      roles: user.roles,
    };

    console.log(user);

    const expires = new Date();
    expires.setSeconds(
      expires.getSeconds() + this.configService.get("JWT_EXPIRATION"),
    );

    const token = this.jwtService.sign(tokenPayload);

    response.cookie("Authentication", token, {
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

  async logout(response: Response) {
    response.clearCookie("Authentication");
    return { message: "Logged out successfully" };
  }
}
