import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';

@Controller('orders')
export class OrdersProxyController {
  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private base(): string {
    return (
      this.config.get<string>('ORDERS_HTTP_BASEURL') || 'http://localhost:3003'
    );
  }

  private forwardHeaders(req: Request) {
    return {
      cookie: req.headers.cookie || '',
      authorization: req.headers.authorization || '',
    };
  }

  @Post()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async create(
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.post(`${this.base()}/orders`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Get()
  async findAll(@Req() req: Request, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.get(`${this.base()}/orders`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Get('my-orders')
  async getMyOrders(@Req() req: Request, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.get(`${this.base()}/orders/my-orders`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Get('by-user/:userId')
  async findByUserId(
    @Param('userId') userId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.get(`${this.base()}/orders/by-user/${userId}`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.get(`${this.base()}/orders/${id}`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  // ← NEW: Update order items and/or shipping address
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.patch(`${this.base()}/orders/${id}`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.patch(`${this.base()}/orders/${id}/status`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.delete(`${this.base()}/orders/${id}`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }
}
