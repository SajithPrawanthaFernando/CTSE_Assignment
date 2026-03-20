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
  let configService: ConfigService;

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'AUTH_HTTP_BASEURL') return 'http://localhost:3001';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(UsersProxyController);
    configService = moduleRef.get(ConfigService);
  });

  describe('Utility Methods', () => {
    it('should return the configured base URL', () => {
      expect((controller as any).base()).toBe('http://localhost:3001');
    });

    it('should fallback to default URL if config returns null', () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      expect((controller as any).base()).toBe('http://localhost:3001');
    });

    it('should forward provided headers correctly', () => {
      const req: any = {
        headers: {
          cookie: 'session=123',
          authorization: 'Bearer token',
        },
      };
      const headers = (controller as any).forwardHeaders(req);
      expect(headers).toEqual({
        cookie: 'session=123',
        authorization: 'Bearer token',
      });
    });

    it('should fallback to empty strings in forwardHeaders when headers are missing', () => {
      const req: any = { headers: {} };
      const headers = (controller as any).forwardHeaders(req);
      expect(headers).toEqual({
        cookie: '',
        authorization: '',
      });
    });
  });

  it('should proxy create user and forward headers', async () => {
    httpService.post.mockReturnValueOnce(
      of({ status: 201, data: { id: '1' } }),
    );
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const req: any = { headers: { authorization: 'Bearer token' } };

    await controller.create({ email: 'test@test.com' }, req, res);

    expect(httpService.post).toHaveBeenCalledWith(
      expect.stringContaining('/users'),
      { email: 'test@test.com' },
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should proxy getMe current user', async () => {
    httpService.get.mockReturnValueOnce(of({ status: 200, data: { id: '1' } }));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const req: any = { headers: {} };

    await controller.getMe(req, res);

    expect(httpService.get).toHaveBeenCalledWith(
      'http://localhost:3001/users',
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy getAll users', async () => {
    httpService.get.mockReturnValueOnce(of({ status: 200, data: [] }));
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const req: any = { headers: {} };

    await controller.getAll(req, res);

    expect(httpService.get).toHaveBeenCalledWith(
      expect.stringContaining('/users/all'),
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy delete user', async () => {
    httpService.delete.mockReturnValueOnce(
      of({ status: 200, data: { ok: true } }),
    );
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const req: any = { headers: {} };

    await controller.delete('123', req, res);

    expect(httpService.delete).toHaveBeenCalledWith(
      expect.stringContaining('/users/123'),
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy changeRole', async () => {
    httpService.put.mockReturnValueOnce(
      of({ status: 200, data: { ok: true } }),
    );
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const req: any = { headers: {} };

    await controller.changeRole('123', { role: 'admin' }, req, res);

    expect(httpService.put).toHaveBeenCalledWith(
      expect.stringContaining('/users/123/role'),
      { role: 'admin' },
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy update user', async () => {
    httpService.put.mockReturnValueOnce(
      of({ status: 200, data: { ok: true } }),
    );
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const req: any = { headers: {} };

    await controller.update('123', { name: 'new' }, req, res);

    expect(httpService.put).toHaveBeenCalledWith(
      'http://localhost:3001/users/123',
      { name: 'new' },
      expect.any(Object),
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
