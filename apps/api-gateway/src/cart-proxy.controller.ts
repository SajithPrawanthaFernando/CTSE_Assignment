import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';

@Controller('cart')
export class CartProxyController {
  constructor(private readonly http: HttpService) {}

  private base() {
    return process.env.ORDERS_HTTP_BASEURL;
  }

  private forwardHeaders(req: Request) {
    return {
      cookie: req.headers.cookie || '',
      authorization: req.headers.authorization || '',
    };
  }

  @Get('my-cart')
  async getCart(@Req() req: Request, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.get(`${this.base()}/cart/my-cart`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Post('items')
  async addItem(
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.post(`${this.base()}/cart/items`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Patch('items/:productId')
  async updateItem(
    @Param('productId') productId: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.patch(`${this.base()}/cart/items/${productId}`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Delete('items/:productId')
  async removeItem(
    @Param('productId') productId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.delete(`${this.base()}/cart/items/${productId}`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Delete()
  async clearCart(@Req() req: Request, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.delete(`${this.base()}/cart`, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Post('checkout')
  async checkout(
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.post(`${this.base()}/cart/checkout`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }
}