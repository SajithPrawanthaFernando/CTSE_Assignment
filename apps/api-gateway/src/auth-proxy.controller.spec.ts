import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AuthProxyController } from './auth-proxy.controller';

describe('AuthProxyController', () => {
  let controller: AuthProxyController;
  let httpService: { post: any };

  beforeEach(async () => {
    process.env.AUTH_HTTP_BASEURL = 'http://localhost:3001';

    httpService = { post: jest.fn() };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          AUTH_HTTP_BASEURL: 'http://localhost:3001',
        };
        return config[key];
      }),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = moduleRef.get(AuthProxyController);
  });

  it('should proxy login and forward Set-Cookie', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { accessToken: 'abc' },
      headers: { 'set-cookie': ['Authentication=abc; Path=/'] },
    };
    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: { cookie: 'Authentication=abc' } };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      json: jest.fn(),
    };

    await controller.login({ email: 'a@b.com', password: 'pass' }, req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'set-cookie',
      ['Authentication=abc; Path=/'],
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ accessToken: 'abc' });
  });

  it('should proxy login and not set cookie header when Set-Cookie absent', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: { accessToken: 'abc' },
      headers: {},
    };
    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: {} };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      json: jest.fn(),
    };

    await controller.login({ email: 'a@b.com', password: 'pass' }, req, res);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy login with missing cookie header (defaults to empty string)', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: {},
      headers: {},
    };
    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: {} };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      json: jest.fn(),
    };

    await controller.login({ email: 'a@b.com', password: 'pass' }, req, res);

    expect(httpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/login',
      { email: 'a@b.com', password: 'pass' },
      expect.objectContaining({
        headers: expect.objectContaining({ cookie: '' }),
        validateStatus: expect.any(Function),
      }),
    );
  });

  it('should proxy logout and forward Set-Cookie', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: {},
      headers: { 'set-cookie': ['Authentication=; Max-Age=0'] },
    };
    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: { cookie: 'Authentication=abc' } };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      json: jest.fn(),
    };

    await controller.logout(req, res);

    expect(res.setHeader).toHaveBeenCalledWith(
      'set-cookie',
      ['Authentication=; Max-Age=0'],
    );
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy logout with missing cookie header (defaults) and no Set-Cookie', async () => {
    const mockAxiosResponse = {
      status: 200,
      data: {},
      headers: {},
    };
    httpService.post.mockReturnValueOnce(of(mockAxiosResponse as any));

    const req: any = { headers: {} };
    const res: any = {
      status: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
      json: jest.fn(),
    };

    await controller.logout(req, res);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });
});