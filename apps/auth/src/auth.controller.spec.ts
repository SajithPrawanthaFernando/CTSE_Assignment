import { Test } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authServiceMock = {
    login: jest.fn(),
    logout: jest.fn(),
    validateToken: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = moduleRef.get(AuthController);
  });

  it('should call AuthService.login and return its result', async () => {
    const user: any = { email: 'test@example.com', roles: ['user'] };
    const response: any = { cookie: jest.fn() };

    authServiceMock.login.mockResolvedValueOnce({
      token: 'jwt-token',
      user: { email: 'test@example.com' },
    });

    const result = await controller.login(user, response);

    expect(authServiceMock.login).toHaveBeenCalledWith(user, response);
    expect(result).toEqual({
      token: 'jwt-token',
      user: { email: 'test@example.com' },
    });
  });

  it('should call validateToken and return user data for authenticate message pattern', async () => {
    const mockUser = { id: '123', email: 'a@b.com' };
    const mockPayload = { Authentication: 'mock-jwt-token' };

    authServiceMock.validateToken.mockResolvedValueOnce(mockUser);

    const result = await controller.authenticate(mockPayload);

    expect(authServiceMock.validateToken).toHaveBeenCalledWith(
      'mock-jwt-token',
    );
    expect(result).toEqual(mockUser);
  });

  it('should call AuthService.logout and return its result', async () => {
    const response: any = { clearCookie: jest.fn() };

    authServiceMock.logout.mockResolvedValueOnce({
      message: 'Logged out successfully',
    });

    const result = await controller.logout(response);

    expect(authServiceMock.logout).toHaveBeenCalledWith(response);
    expect(result).toEqual({ message: 'Logged out successfully' });
  });
});
