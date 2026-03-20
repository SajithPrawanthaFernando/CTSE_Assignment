import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from './users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_EXPIRATION') return 3600;
      if (key === 'JWT_SECRET') return 'test-secret';
      return undefined;
    }),
  };

  const jwtServiceMock = {
    sign: jest.fn(() => 'mock-jwt-token'),
    verify: jest.fn(),
  };

  const usersServiceMock = {
    getUser: jest.fn(),
  };

  const responseMock = () => ({
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: UsersService, useValue: usersServiceMock },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should set Authentication cookie and return token + user payload on login', async () => {
    const res = responseMock() as any;

    const user: any = {
      _id: 'user-id-hex',
      email: 'test@example.com',
      roles: ['user'],
      fullname: 'Test User',
      phone: '+94771234567',
      address: 'Colombo',
      firstname: 'Test',
      lastname: 'User',
    };

    const result = await service.login(user, res);

    expect(jwtServiceMock.sign).toHaveBeenCalledTimes(1);
    expect(res.cookie).toHaveBeenCalledTimes(1);

    const [cookieName, cookieValue, cookieOptions] = res.cookie.mock.calls[0];
    expect(cookieName).toBe('Authentication');
    expect(cookieValue).toBe('mock-jwt-token');
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.expires).toBeInstanceOf(Date);

    expect(result).toEqual({
      token: 'mock-jwt-token',
      user: {
        id: user._id,
        email: user.email,
        roles: user.roles,
        fullname: user.fullname,
        phone: user.phone,
        address: user.address,
        firstname: user.firstname,
        lastname: user.lastname,
      },
    });
  });

  it('should clear Authentication cookie on logout', async () => {
    const res = responseMock() as any;

    const result = await service.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith('Authentication');
    expect(result).toEqual({ message: 'Logged out successfully' });
  });

  describe('validateToken', () => {
    it('should verify token and return user if valid', async () => {
      const mockPayload = { userId: '123' };
      const mockUser = { _id: '123', email: 'test@test.com' };

      jwtServiceMock.verify.mockReturnValue(mockPayload);
      usersServiceMock.getUser.mockResolvedValue(mockUser);

      const result = await service.validateToken('valid-token');

      expect(jwtServiceMock.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });

      expect(usersServiceMock.getUser).toHaveBeenCalledWith({ _id: '123' });
      expect(result).toEqual(mockUser);
    });

    it('should throw error if token is invalid', async () => {
      jwtServiceMock.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.validateToken('invalid-token')).rejects.toThrow();
    });

    it('should throw error if user is not found', async () => {
      const mockPayload = { userId: '404' };
      jwtServiceMock.verify.mockReturnValue(mockPayload);
      usersServiceMock.getUser.mockResolvedValue(null);

      await expect(service.validateToken('valid-token')).rejects.toThrow(
        'User not found',
      );
    });
  });
});
