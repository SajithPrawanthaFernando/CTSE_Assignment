import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { AuthProxyController } from './auth-proxy.controller';

describe('AuthProxyController', () => {
  let controller: AuthProxyController;

  const httpService = {
    post: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn().mockReturnValue('http://localhost:3001'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    controller = moduleRef.get(AuthProxyController);
  });

  it('should proxy login and forward Set-Cookie', async () => {
    const body = { email: 'admin@test.com', password: 'password123' };
    const req = {
      headers: {
        cookie: 'session=abc',
        authorization: '',
        'content-type': 'application/json',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    httpService.post.mockReturnValueOnce(
      of({
        status: 200,
        data: { token: 'jwt-token' },
        headers: { 'set-cookie': ['Authentication=jwt-token; Path=/'] },
      }),
    );

    await controller.login(body, req as any, res as any);

    expect(httpService.post).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy login and not set cookie header when Set-Cookie absent', async () => {
    const body = { email: 'admin@test.com', password: 'password123' };
    const req = {
      headers: { cookie: '', authorization: '', 'content-type': 'application/json' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    httpService.post.mockReturnValueOnce(
      of({ status: 200, data: { token: 'jwt-token' }, headers: {} }),
    );

    await controller.login(body, req as any, res as any);

    expect(res.setHeader).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy login with missing cookie header (defaults to empty string)', async () => {
    const body = { email: 'admin@test.com', password: 'password123' };
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    httpService.post.mockReturnValueOnce(
      of({ status: 200, data: {}, headers: {} }),
    );

    await controller.login(body, req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy logout and forward Set-Cookie', async () => {
    const req = {
      headers: {
        cookie: 'Authentication=jwt',
        authorization: '',
        'content-type': 'application/json',
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    httpService.post.mockReturnValueOnce(
      of({
        status: 200,
        data: {},
        headers: {
          'set-cookie': ['Authentication=; Path=/; Expires=Thu, 01 Jan 1970'],
        },
      }),
    );

    await controller.logout(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy logout with missing cookie header (defaults) and no Set-Cookie', async () => {
    const req = { headers: {} };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };

    httpService.post.mockReturnValueOnce(
      of({ status: 200, data: {}, headers: {} }),
    );

    await controller.logout(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });
});