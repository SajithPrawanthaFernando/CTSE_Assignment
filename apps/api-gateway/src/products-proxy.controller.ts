import {
  Body, Controller, Delete, Get, Param,
  Patch, Post, Query, Req, Res, UseGuards, Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../auth/src/guards/jwt-auth.guard';

@Controller('products')
export class ProductsProxyController {
  private readonly logger = new Logger(ProductsProxyController.name);

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {}

  private base(): string {
    return (
      this.config.get<string>('PRODUCTS_HTTP_BASEURL') ||
      'http://localhost:3002'
    );
  }

  private forwardHeaders(req: Request) {
    return {
      cookie: req.headers.cookie || '',
      authorization: req.headers.authorization || '',
      'content-type': req.headers['content-type'] || 'application/json',
    };
  }

  private handleProxyError(res: Response, error: any, route: string) {
    if (
      error?.code === 'ECONNREFUSED' ||
      error?.name === 'AggregateError' ||
      error?.cause?.code === 'ECONNREFUSED'
    ) {
      this.logger.error(
        `[${route}] Products service unreachable at ${this.base()}`,
      );
      return res.status(502).json({
        statusCode: 502,
        message: 'Products service is unavailable. Please try again later.',
      });
    }
    this.logger.error(
      `[${route}] Unexpected error: ${error?.message}`,
      error?.stack,
    );
    return res.status(500).json({
      statusCode: 500,
      message: 'Internal gateway error.',
    });
  }

  // ─── Public routes (no auth required) ────────────────────────────────────

  @Get()
  async findAll(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const url = `${this.base()}/products`;
      this.logger.log(`[findAll] GET ${url}`);
      const response = await lastValueFrom(
        this.http.get(url, {
          params: query,
          headers: this.forwardHeaders({ headers: {} } as Request),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      return this.handleProxyError(res, error, 'findAll');
    }
  }

  @Get('bulk')
  async findByIds(
    @Query() query: Record<string, string>,
    @Res() res: Response,
  ) {
    try {
      const url = `${this.base()}/products/bulk`;
      this.logger.log(`[findByIds] GET ${url}`);
      const response = await lastValueFrom(
        this.http.get(url, {
          params: query,
          headers: this.forwardHeaders({ headers: {} } as Request),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      return this.handleProxyError(res, error, 'findByIds');
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    try {
      const url = `${this.base()}/products/${id}`;
      this.logger.log(`[findOne] GET ${url}`);
      const response = await lastValueFrom(
        this.http.get(url, {
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      return this.handleProxyError(res, error, 'findOne');
    }
  }

  // ─── Protected routes (JWT required) ─────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const url = `${this.base()}/products`;
      this.logger.log(`[create] POST ${url}`);
      const response = await lastValueFrom(
        this.http.post(url, body, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      return this.handleProxyError(res, error, 'create');
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const url = `${this.base()}/products/${id}`;
      this.logger.log(`[update] PATCH ${url}`);
      const response = await lastValueFrom(
        this.http.patch(url, body, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      return this.handleProxyError(res, error, 'update');
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    try {
      const url = `${this.base()}/products/${id}`;
      this.logger.log(`[remove] DELETE ${url}`);
      const response = await lastValueFrom(
        this.http.delete(url, {
          headers: this.forwardHeaders(req),
          validateStatus: () => true,
        }),
      );
      return res.status(response.status).json(response.data);
    } catch (error) {
      return this.handleProxyError(res, error, 'remove');
    }
  }
}