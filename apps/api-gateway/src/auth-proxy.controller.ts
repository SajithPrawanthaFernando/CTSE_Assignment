import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';

@Controller('auth')
export class AuthProxyController {
  constructor(private readonly http: HttpService) {}

  @Post('login')
  async login(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    const base = process.env.AUTH_HTTP_BASEURL;

    const response = await lastValueFrom(
      this.http.post(`${base}/auth/login`, body, {
        headers: { cookie: req.headers.cookie || '' },

        withCredentials: true,
        validateStatus: () => true,
      }),
    );

    const setCookie = response.headers['set-cookie'];
    if (setCookie) res.setHeader('set-cookie', setCookie);

    return res.status(response.status).json(response.data);
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    const base = process.env.AUTH_HTTP_BASEURL;

    const response = await lastValueFrom(
      this.http.post(
        `${base}/auth/logout`,
        {},
        {
          headers: { cookie: req.headers.cookie || '' },
          withCredentials: true,
          validateStatus: () => true,
        },
      ),
    );

    const setCookie = response.headers['set-cookie'];
    if (setCookie) res.setHeader('set-cookie', setCookie);

    return res.status(response.status).json(response.data);
  }
}
