import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('products')
export class ProductsProxyController {
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

  @Get('bulk')
  async findByIds(@Query() query: Record<string, string>, @Res() res: Response) {
    const url = `${this.base()}/products/bulk`;
    const response = await lastValueFrom(
      this.http.get(url, {
        params: query,
        headers: this.forwardHeaders({ headers: {} } as Request),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.post(`${this.base()}/products`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Get()
  async findAll(@Query() query: Record<string, string>, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.get(`${this.base()}/products`, {
        params: query,
        headers: this.forwardHeaders({ headers: {} } as Request),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.get(`${this.base()}/products/${id}`, {
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const response = await lastValueFrom(
      this.http.patch(`${this.base()}/products/${id}`, body, {
        headers: this.forwardHeaders(req),
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Res() res: Response) {
    const response = await lastValueFrom(
      this.http.delete(`${this.base()}/products/${id}`, {
        validateStatus: () => true,
      }),
    );
    return res.status(response.status).json(response.data);
  }
}
