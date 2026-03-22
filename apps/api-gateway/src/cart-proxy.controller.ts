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
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('cart')
export class CartProxyController {
  private readonly logger = new Logger(CartProxyController.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private base(): string {
    return (
      this.config.get<string>('CART_HTTP_BASEURL') || 'http://localhost:3003'
    );
  }

  private forwardHeaders(req: Request) {
    return {
      cookie: req.headers.cookie || '',
      authorization: req.headers.authorization || '',
    };
  }

  /**
   * Helper method to handle requests and log deep error details
   * especially for AggregateErrors.
   */
  private async safeProxy(
    method: 'get' | 'post' | 'patch' | 'delete',
    url: string,
    data?: any,
    req?: Request,
  ) {
    this.logger.log(`Proxying ${method.toUpperCase()} to: ${url}`);

    try {
      const config = {
        headers: this.forwardHeaders(req),
        validateStatus: () => true, // Let the controller handle the status codes
      };

      const request$ =
        method === 'get' || method === 'delete'
          ? this.http[method](url, config)
          : this.http[method](url, data, config);

      return await lastValueFrom(request$);
    } catch (error: any) {
      this.logger.error(`[PROXY FAILURE] ${method.toUpperCase()} ${url}`);

      // Handle AggregateError (common in Node 18+ for DNS/Connection issues)
      if (error.errors && Array.isArray(error.errors)) {
        this.logger.error(
          `Detected AggregateError with ${error.errors.length} failures:`,
        );
        error.errors.forEach((err: any, index: number) => {
          this.logger.error(
            `  Failure ${index}: ${err.message} (Code: ${err.code})`,
          );
        });
      } else {
        this.logger.error(`Error Message: ${error.message}`);
        this.logger.error(`Error Code: ${error.code}`);
      }

      // Return a 502 Bad Gateway response structure so the frontend knows the proxy failed
      return {
        status: 502,
        data: {
          message: 'Proxy connection failed',
          details: error.message,
          target: url,
        },
      };
    }
  }

  @Get('my-cart')
  async getCart(@Req() req: Request, @Res() res: Response) {
    const response = await this.safeProxy(
      'get',
      `${this.base()}/cart/my-cart`,
      null,
      req,
    );
    return res.status(response.status).json(response.data);
  }

  @Post('items')
  async addItem(
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await this.safeProxy(
      'post',
      `${this.base()}/cart/items`,
      body,
      req,
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
    const response = await this.safeProxy(
      'patch',
      `${this.base()}/cart/items/${productId}`,
      body,
      req,
    );
    return res.status(response.status).json(response.data);
  }

  @Delete('items/:productId')
  async removeItem(
    @Param('productId') productId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await this.safeProxy(
      'delete',
      `${this.base()}/cart/items/${productId}`,
      null,
      req,
    );
    return res.status(response.status).json(response.data);
  }

  @Delete()
  async clearCart(@Req() req: Request, @Res() res: Response) {
    const response = await this.safeProxy(
      'delete',
      `${this.base()}/cart`,
      null,
      req,
    );
    return res.status(response.status).json(response.data);
  }

  @Post('checkout')
  async checkout(
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await this.safeProxy(
      'post',
      `${this.base()}/cart/checkout`,
      body,
      req,
    );
    return res.status(response.status).json(response.data);
  }
}
