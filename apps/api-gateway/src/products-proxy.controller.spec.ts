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

  const mockReq = {
    headers: {
      cookie: 'test-cookie',
      authorization: 'Bearer token',
      authentication: 'auth-val',
      ['content-type']: 'application/json',
    },
  } as any;

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

  it('should return the configured base URL', () => {
    expect((controller as any).base()).toBe('http://localhost:3002');
  });

  it('should fall back to default URL if config returns null', () => {
    const controllerWithNoConfig = new ProductsProxyController(
      httpService as any,
      { get: () => null } as any,
    );
    expect((controllerWithNoConfig as any).base()).toBe(
      'http://localhost:3002',
    );
  });

  it('should correctly forward headers', () => {
    const result = (controller as any).forwardHeaders(mockReq);
    expect(result).toEqual({
      cookie: 'test-cookie',
      authorization: 'Bearer token',
      authentication: 'auth-val',
      'content-type': 'application/json',
    });
  });

  it('should use default content-type if missing in headers', () => {
    const reqNoType = { headers: {} } as any;
    const result = (controller as any).forwardHeaders(reqNoType);
    expect(result['content-type']).toBe('application/json');
  });

  it('should return 502 when service returns ECONNREFUSED', async () => {
    const error = { code: 'ECONNREFUSED' };
    httpService.get.mockReturnValueOnce(throwError(() => error));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({}, mockReq, res);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 502 }),
    );
  });

  it('should return 502 when error name is AggregateError', async () => {
    const error = { name: 'AggregateError' };
    httpService.get.mockReturnValueOnce(throwError(() => error));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findByIds({}, mockReq, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 502 when nested cause is ECONNREFUSED', async () => {
    const error = { cause: { code: 'ECONNREFUSED' } };
    httpService.get.mockReturnValueOnce(throwError(() => error));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findOne('1', mockReq, res);

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('should return 500 for generic unexpected errors', async () => {
    const error = new Error('Random crash');
    httpService.post.mockReturnValueOnce(throwError(() => error));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({}, mockReq, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal gateway error.' }),
    );
  });

  it('should proxy findAll successfully', async () => {
    httpService.get.mockReturnValueOnce(of({ status: 200, data: ['p1'] }));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findAll({ page: '1' }, mockReq, res);

    expect(httpService.get).toHaveBeenCalledWith(
      expect.stringContaining('/products'),
      expect.objectContaining({ params: { page: '1' } }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(['p1']);
  });

  it('should proxy findByIds successfully', async () => {
    httpService.get.mockReturnValueOnce(of({ status: 200, data: ['p1'] }));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findByIds({ ids: '1,2' }, mockReq, res);

    expect(httpService.get).toHaveBeenCalledWith(
      expect.stringContaining('/products/bulk'),
      expect.objectContaining({ params: { ids: '1,2' } }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy findOne successfully', async () => {
    httpService.get.mockReturnValueOnce(of({ status: 200, data: { id: '1' } }));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.findOne('1', mockReq, res);

    expect(httpService.get).toHaveBeenCalledWith(
      expect.stringContaining('/products/1'),
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy create successfully', async () => {
    httpService.post.mockReturnValueOnce(
      of({ status: 201, data: { id: '2' } }),
    );
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({ name: 'New' }, mockReq, res);

    expect(httpService.post).toHaveBeenCalledWith(
      expect.any(String),
      { name: 'New' },
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should proxy update successfully', async () => {
    httpService.patch.mockReturnValueOnce(
      of({ status: 200, data: { id: '1' } }),
    );
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.update('1', { price: 10 }, mockReq, res);

    expect(httpService.patch).toHaveBeenCalledWith(
      expect.stringContaining('/products/1'),
      { price: 10 },
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy remove successfully', async () => {
    httpService.delete.mockReturnValueOnce(
      of({ status: 200, data: { success: true } }),
    );
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.remove('1', mockReq, res);

    expect(httpService.delete).toHaveBeenCalledWith(
      expect.stringContaining('/products/1'),
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
