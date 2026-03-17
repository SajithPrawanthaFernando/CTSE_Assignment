import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { UsersProxyController } from './users-proxy.controller';

describe('UsersProxyController', () => {
  let controller: UsersProxyController;

  const httpService = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn().mockReturnValue('http://localhost:3001'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersProxyController],
      providers: [
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    controller = moduleRef.get(UsersProxyController);
  });

  it('should cover base() and forwardHeaders() defaults', async () => {
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.get.mockReturnValueOnce(of({ status: 200, data: [] }));

    // ← getAll not getAllUsers
    await controller.getAll(req as any, res as any);

    expect(configServiceMock.get).toHaveBeenCalledWith('AUTH_HTTP_BASEURL');
  });

  it('should proxy create user and forward headers', async () => {
    const body = {
      email: 'user@test.com',
      password: 'pass',
      fullname: 'Test User',
    };
    const req = {
      headers: {
        cookie: 'session=abc',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.post.mockReturnValueOnce(
      of({ status: 201, data: { id: '1', ...body } }),
    );

    // ← create not createUser
    await controller.create(body, req as any, res as any);

    expect(httpService.post).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should proxy create user with missing headers (defaults)', async () => {
    const body = {
      email: 'user@test.com',
      password: 'pass',
      fullname: 'Test User',
    };
    const req = { headers: {} };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.post.mockReturnValueOnce(of({ status: 201, data: {} }));

    await controller.create(body, req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('should proxy get current user', async () => {
    const req = {
      headers: {
        cookie: 'Authentication=jwt',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.get.mockReturnValueOnce(
      of({ status: 200, data: { id: '1', email: 'user@test.com' } }),
    );

    // ← getMe is correct
    await controller.getMe(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy get all users', async () => {
    const req = {
      headers: {
        cookie: '',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.get.mockReturnValueOnce(of({ status: 200, data: [] }));

    // ← getAll not getAllUsers
    await controller.getAll(req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy delete user', async () => {
    const req = {
      headers: {
        cookie: '',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.delete.mockReturnValueOnce(of({ status: 200, data: {} }));

    // ← delete not deleteUser
    await controller.delete('user-id-123', req as any, res as any);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy change role', async () => {
    const req = {
      headers: {
        cookie: '',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.put.mockReturnValueOnce(of({ status: 200, data: {} }));

    // ← changeRole is correct
    await controller.changeRole(
      'user-id-123',
      { role: 'admin' },
      req as any,
      res as any,
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should proxy update user', async () => {
    const req = {
      headers: {
        cookie: '',
        authorization: 'Bearer token',
        'content-type': 'application/json',
      },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    httpService.put.mockReturnValueOnce(of({ status: 200, data: {} }));

    // ← update not updateUser
    await controller.update(
      'user-id-123',
      { fullname: 'Updated Name' },
      req as any,
      res as any,
    );

    expect(res.status).toHaveBeenCalledWith(200);
  });
});