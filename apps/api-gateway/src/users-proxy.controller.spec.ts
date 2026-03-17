import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { UsersProxyController } from './users-proxy.controller';

describe('UsersProxyController', () => {
  let controller: UsersProxyController;
  let httpService: {
    get: any;
    post: any;
    put: any;
    delete: any;
  };

  beforeEach(async () => {
    process.env.AUTH_HTTP_BASEURL = 'http://localhost:3001';

    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AUTH_HTTP_BASEURL: 'http://localhost:3001',
        };
        return config[key];
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = moduleRef.get(UsersProxyController);
  });

  it('should cover base() and forwardHeaders() defaults', () => {
    expect((controller as any).base()).toBe('http://localhost:3001');

    const req: any = { headers: {} };
    expect((controller as any).forwardHeaders(req)).toEqual({
      cookie: '',
      authorization: '',
    });
  });

  it('should proxy create user and forward headers', async () => {
    const mockAxiosResponse = {
      status: 201,
      data: { _id: '1', email: 'x@y.com' },
      headers: {},
    };
    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = {
      headers: {
        cookie: 'Authentication=abc',
        authorization: 'Bearer token',
      },
    };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.create(
      { email: 'x@y.com', password: 'Qw123456!' },
      req,
      res,
    );

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/users',
      { email: 'x@y.com', password: 'Qw123456!' },
      expect.objectContaining({
        headers: {
          cookie: 'Authentication=abc',
          authorization: 'Bearer token',
        },
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ _id: '1', email: 'x@y.com' });
  });

  it('should proxy create user with missing headers (defaults)', async () => {
    const mockAxiosResponse = {
      status: 201,
      data: { ok: true },
      headers: {},
    };
    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: {} };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.create({ email: 'a@b.com' }, req, res);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/users',
      { email: 'a@b.com' },
      expect.objectContaining({
        headers: { cookie: '', authorization: '' },
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('should proxy get current user', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { email: 'me@test.com' },
      headers: {},
    };
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = {
      headers: { cookie: 'Authentication=abc', authorization: '' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.getMe(req, res);

    expect(httpService.get).toHaveBeenCalledWith(
      'http://localhost:3001/users',
      expect.objectContaining({
        headers: { cookie: 'Authentication=abc', authorization: '' },
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ email: 'me@test.com' });
  });

  it('should proxy get all users', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: [{ email: 'a@a.com' }],
      headers: {},
    };
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: { cookie: '', authorization: 'Bearer token' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.getAll(req, res);

    expect(httpService.get).toHaveBeenCalledWith(
      'http://localhost:3001/users/all',
      expect.objectContaining({
        headers: { cookie: '', authorization: 'Bearer token' },
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([{ email: 'a@a.com' }]);
  });

  it('should proxy delete user', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { deleted: true },
      headers: {},
    };
    httpService.delete.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = {
      headers: { cookie: 'Authentication=abc', authorization: '' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.delete('123', req, res);

    expect(httpService.delete).toHaveBeenCalledWith(
      'http://localhost:3001/users/123',
      expect.objectContaining({
        headers: { cookie: 'Authentication=abc', authorization: '' },
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ deleted: true });
  });

  it('should proxy change role', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { ok: true },
      headers: {},
    };
    httpService.put.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: { cookie: '', authorization: 'Bearer t' } };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.changeRole('123', { role: 'admin' }, req, res);

    expect(httpService.put).toHaveBeenCalledWith(
      'http://localhost:3001/users/123/role',
      { role: 'admin' },
      expect.objectContaining({
        headers: { cookie: '', authorization: 'Bearer t' },
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('should proxy update user', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { ok: true },
      headers: {},
    };
    httpService.put.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = {
      headers: { cookie: 'Authentication=abc', authorization: '' },
    };
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await controller.update('123', { fullname: 'New Name' }, req, res);

    expect(httpService.put).toHaveBeenCalledWith(
      'http://localhost:3001/users/123',
      { fullname: 'New Name' },
      expect.objectContaining({
        headers: { cookie: 'Authentication=abc', authorization: '' },
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});