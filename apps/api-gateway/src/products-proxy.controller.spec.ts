import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ProductsProxyController } from './products-proxy.controller';

describe('ProductsProxyController', () => {
  let controller: ProductsProxyController;
  let httpService: {
    get: any;
    post: any;
    patch: any;
    delete: any;
  };

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('http://localhost:3002') },
        },
      ],
    }).compile();

    controller = moduleRef.get(ProductsProxyController);
  });

  // ─── base() and forwardHeaders() ─────────────────────────────────────────

  it('should return the configured base URL', () => {
    expect((controller as any).base()).toBe('http://localhost:3002');
  });

  it('should fall back to empty strings in forwardHeaders when headers are missing', () => {
    const req: any = { headers: {} };
    expect((controller as any).forwardHeaders(req)).toEqual({
      cookie: '',
      authorization: '',
      'content-type': 'application/json',
    });
  });

  it('should forward all headers when present', () => {
    const req: any = {
      headers: {
        cookie: 'session=abc',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    expect((controller as any).forwardHeaders(req)).toEqual({
      cookie: 'session=abc',
      authorization: 'Bearer token',
      'content-type': 'application/json',
    });
  });

  // ─── GET /products ────────────────────────────────────────────────────────

  it('should proxy findAll and return 200 with data', async () => {
    httpService.get.mockReturnValueOnce(
      of({ status: 200, data: [{ id: 1, name: 'Widget' }] }),
    );

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({ page: '1' }, res);

    expect(httpService.get).toHaveBeenCalledWith(
      'http://localhost:3002/products',
      expect.objectContaining({ params: { page: '1' } }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 1, name: 'Widget' }]);
  });

  it('should forward upstream 404 from findAll', async () => {
    httpService.get.mockReturnValueOnce(
      of({ status: 404, data: { message: 'Not found' } }),
    );

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({}, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Not found' });
  });

  it('should return 502 from findAll on ECONNREFUSED', async () => {
    const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    httpService.get.mockReturnValueOnce(throwError(() => err));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({}, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 502 }),
    );
  });

  it('should return 502 from findAll on AggregateError', async () => {
    const err = Object.assign(new Error('aggregate'), { name: 'AggregateError' });
    httpService.get.mockReturnValueOnce(throwError(() => err));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({}, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 502 from findAll on nested cause ECONNREFUSED', async () => {
    const err = Object.assign(new Error('wrapped'), { cause: { code: 'ECONNREFUSED' } });
    httpService.get.mockReturnValueOnce(throwError(() => err));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({}, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 500 from findAll on unexpected error', async () => {
    httpService.get.mockReturnValueOnce(throwError(() => new Error('boom')));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  // ─── GET /products/bulk ───────────────────────────────────────────────────

  it('should proxy findByIds with query params', async () => {
    httpService.get.mockReturnValueOnce(
      of({ status: 200, data: [{ id: 2 }, { id: 5 }] }),
    );

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findByIds({ ids: '2,5' }, res);

    expect(httpService.get).toHaveBeenCalledWith(
      'http://localhost:3002/products/bulk',
      expect.objectContaining({ params: { ids: '2,5' } }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ id: 2 }, { id: 5 }]);
  });

  it('should return 502 from findByIds on ECONNREFUSED', async () => {
    const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    httpService.get.mockReturnValueOnce(throwError(() => err));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findByIds({}, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 500 from findByIds on unexpected error', async () => {
    httpService.get.mockReturnValueOnce(throwError(() => new Error('fail')));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findByIds({}, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ─── GET /products/:id ────────────────────────────────────────────────────

  it('should proxy findOne and return 200 with data', async () => {
    httpService.get.mockReturnValueOnce(
      of({ status: 200, data: { id: '42', name: 'Gadget' } }),
    );

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findOne('42', res);

    expect(httpService.get).toHaveBeenCalledWith(
      'http://localhost:3002/products/42',
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: '42', name: 'Gadget' });
  });

  it('should forward upstream 404 from findOne', async () => {
    httpService.get.mockReturnValueOnce(
      of({ status: 404, data: { message: 'Not found' } }),
    );

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findOne('999', res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 502 from findOne on ECONNREFUSED', async () => {
    const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    httpService.get.mockReturnValueOnce(throwError(() => err));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findOne('1', res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 500 from findOne on unexpected error', async () => {
    httpService.get.mockReturnValueOnce(throwError(() => new Error('oops')));

    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findOne('1', res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ─── POST /products ───────────────────────────────────────────────────────

  it('should proxy create and return 201 with the created product', async () => {
    httpService.post.mockReturnValueOnce(
      of({ status: 201, data: { id: '1', name: 'New Widget', price: 9.99 } }),
    );

    const req: any = {
      headers: {
        cookie: 'session=abc',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({ name: 'New Widget', price: 9.99 }, req, res);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3002/products',
      { name: 'New Widget', price: 9.99 },
      expect.objectContaining({
        headers: {
          cookie: 'session=abc',
          authorization: 'Bearer token',
          'content-type': 'application/json',
        },
        validateStatus: expect.any(Function),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: '1', name: 'New Widget', price: 9.99 });
  });

  it('should proxy create with missing headers (defaults)', async () => {
    httpService.post.mockReturnValueOnce(
      of({ status: 201, data: { ok: true } }),
    );

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({ name: 'Widget' }, req, res);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3002/products',
      { name: 'Widget' },
      expect.objectContaining({
        headers: { cookie: '', authorization: '', 'content-type': 'application/json' },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should forward upstream 422 from create', async () => {
    httpService.post.mockReturnValueOnce(
      of({ status: 422, data: { message: 'Validation failed' } }),
    );

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({}, req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ message: 'Validation failed' });
  });

  it('should return 502 from create on ECONNREFUSED', async () => {
    const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    httpService.post.mockReturnValueOnce(throwError(() => err));

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({}, req, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 500 from create on unexpected error', async () => {
    httpService.post.mockReturnValueOnce(throwError(() => new Error('fail')));

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({}, req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ─── PATCH /products/:id ──────────────────────────────────────────────────

  it('should proxy update and return 200 with updated product', async () => {
    httpService.patch.mockReturnValueOnce(
      of({ status: 200, data: { id: '7', price: 19.99 } }),
    );

    const req: any = {
      headers: {
        cookie: '',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.update('7', { price: 19.99 }, req, res);

    expect(httpService.patch).toHaveBeenCalledWith(
      'http://localhost:3002/products/7',
      { price: 19.99 },
      expect.objectContaining({
        headers: {
          cookie: '',
          authorization: 'Bearer token',
          'content-type': 'application/json',
        },
        validateStatus: expect.any(Function),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ id: '7', price: 19.99 });
  });

  it('should forward upstream 404 from update', async () => {
    httpService.patch.mockReturnValueOnce(
      of({ status: 404, data: { message: 'Not found' } }),
    );

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.update('999', {}, req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 502 from update on ECONNREFUSED', async () => {
    const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    httpService.patch.mockReturnValueOnce(throwError(() => err));

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.update('1', {}, req, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 500 from update on unexpected error', async () => {
    httpService.patch.mockReturnValueOnce(throwError(() => new Error('fail')));

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.update('1', {}, req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  // ─── DELETE /products/:id ─────────────────────────────────────────────────

  it('should proxy remove and return 200', async () => {
    httpService.delete.mockReturnValueOnce(
      of({ status: 200, data: { deleted: true } }),
    );

    const req: any = {
      headers: {
        cookie: 'session=abc',
        authorization: '',
        'content-type': 'application/json',
      },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.remove('3', req, res);

    expect(httpService.delete).toHaveBeenCalledWith(
      'http://localhost:3002/products/3',
      expect.objectContaining({
        headers: {
          cookie: 'session=abc',
          authorization: '',
          'content-type': 'application/json',
        },
        validateStatus: expect.any(Function),
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: true });
  });

  it('should forward upstream 404 from remove', async () => {
    httpService.delete.mockReturnValueOnce(
      of({ status: 404, data: { message: 'Not found' } }),
    );

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.remove('404id', req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should return 502 from remove on ECONNREFUSED', async () => {
    const err = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' });
    httpService.delete.mockReturnValueOnce(throwError(() => err));

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.remove('1', req, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 500 from remove on unexpected error', async () => {
    httpService.delete.mockReturnValueOnce(throwError(() => new Error('fail')));

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.remove('1', req, res);

    expect(res.status).toHaveBeenCalledWith(500);
  });
});