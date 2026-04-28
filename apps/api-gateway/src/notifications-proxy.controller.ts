import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('notifications')
export class NotificationsProxyController {
  private readonly logger = new Logger(NotificationsProxyController.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private base(): string {
    return (
      this.config.get<string>('NOTIFICATIONS_HTTP_BASEURL') ||
      'http://localhost:3012'
    );
  }

  private forwardHeaders(req: Request) {
    return {
      cookie: req.headers.cookie || '',
      authorization: req.headers.authorization || '',
      authentication: req.headers.authentication || '',
      'content-type': req.headers['content-type'] || 'application/json',
    };
  }

  @Post('email')
  async sendEmail(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const url = `${this.base()}/notifications/email`;
      this.logger.log(`Proxying email to: ${url}`);

      const response = await lastValueFrom(
        this.http.post(url, body, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(`Notification email proxy error: ${error.message}`);
      return res
        .status(502)
        .json({ message: 'Notification service unavailable' });
    }
  }

  @Post('sms')
  async sendSms(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const url = `${this.base()}/notifications/sms`;
      const response = await lastValueFrom(
        this.http.post(url, body, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(`Notification SMS proxy error: ${error.message}`);
      return res
        .status(502)
        .json({ message: 'Notification service unavailable' });
    }
  }

  @Post('in-app/create')
  async createInAppNotification(
    @Body() body: any,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const url = `${this.base()}/notifications/in-app/create`;
      const response = await lastValueFrom(
        this.http.post(url, body, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(`In-app creation proxy error: ${error.message}`);
      return res
        .status(502)
        .json({ message: 'Notification service unavailable' });
    }
  }

  @Get()
  async getUserNotifications(@Req() req: Request, @Res() res: Response) {
    try {
      const url = `${this.base()}/notifications`;
      const response = await lastValueFrom(
        this.http.get(url, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(
        `Failed to fetch notifications proxy: ${error.message}`,
      );
      return res.status(502).json({ message: 'Notifications unavailable' });
    }
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: Request, @Res() res: Response) {
    try {
      const url = `${this.base()}/notifications/read-all`;
      const response = await lastValueFrom(
        this.http.patch(
          url,
          {},
          {
            headers: this.forwardHeaders(req),
            validateStatus: () => true,
          },
        ),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(
        `Failed to update notifications proxy: ${error.message}`,
      );
      return res.status(502).json({ message: 'Update failed' });
    }
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const url = `${this.base()}/notifications/${id}`;
      const response = await lastValueFrom(
        this.http.delete(url, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      this.logger.error(
        `Failed to delete notification proxy: ${error.message}`,
      );
      return res.status(502).json({ message: 'Delete failed' });
    }
  }
}
