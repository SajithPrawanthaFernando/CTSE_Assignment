import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AuthProxyController } from './auth-proxy.controller';

describe('AuthProxyController', () => {
  let controller: AuthProxyController;
  let httpService: { post: any };

  beforeEach(async () => {
    process.env.AUTH_HTTP_BASEURL = 'http://localhost:3001';

    httpService = {
      post: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthProxyController],
      providers: [{ provide: HttpService, useValue: httpService }],
    }).compile();

    controller = moduleRef.get(AuthProxyController);
  });

  it('should proxy login and forward Set-Cookie', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { token: 't', user: { email: 'a@b.com' } },
      headers: { 'set-cookie': ['Authentication=abc; HttpOnly'] },
    };

    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: { cookie: '' } };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.login(
      { email: 'a@b.com', password: 'Qw123456!' },
      req,
      res,
    );

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/login',
      { email: 'a@b.com', password: 'Qw123456!' },
      expect.objectContaining({
        headers: { cookie: '' },
        withCredentials: true,
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.setHeader).toHaveBeenCalledWith('set-cookie', [
      'Authentication=abc; HttpOnly',
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      token: 't',
      user: { email: 'a@b.com' },
    });
  });

  it('should proxy login and not set cookie header when Set-Cookie absent', async () => {
    const mockAxiosResponse = {
      status: 401,
      data: { message: 'Unauthorized' },
      headers: {},
    };

    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: { cookie: 'Authentication=old' } };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.login({ email: 'a@b.com', password: 'wrong' }, req, res);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('should proxy login with missing cookie header (defaults to empty string)', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { ok: true },
      headers: {},
    };

    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: {} }; // cookie missing
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.login(
      { email: 'a@b.com', password: 'Qw123456!' },
      req,
      res,
    );

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/login',
      { email: 'a@b.com', password: 'Qw123456!' },
      expect.objectContaining({
        headers: { cookie: '' }, // default branch covered
        withCredentials: true,
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  it('should proxy logout and forward Set-Cookie', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { message: 'Logged out successfully' },
      headers: {
        'set-cookie': [
          'Authentication=; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        ],
      },
    };

    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: { cookie: 'Authentication=abc' } };
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.logout(req, res);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/logout',
      {},
      expect.objectContaining({
        headers: { cookie: 'Authentication=abc' },
        withCredentials: true,
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.setHeader).toHaveBeenCalledWith('set-cookie', [
      'Authentication=; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    ]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });

  it('should proxy logout with missing cookie header (defaults) and no Set-Cookie', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { message: 'Logged out successfully' },
      headers: {}, // set-cookie missing branch
    };

    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: {} }; // cookie missing branch
    const res: any = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await controller.logout(req, res);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/logout',
      {},
      expect.objectContaining({
        headers: { cookie: '' }, // default branch covered
        withCredentials: true,
        validateStatus: expect.any(Function),
      }),
    );

    expect(res.setHeader).not.toHaveBeenCalled(); // set-cookie missing branch covered
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Logged out successfully',
    });
  });
});
