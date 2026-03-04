import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let service: AuthService;

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_EXPIRATION') return 3600;
      return undefined;
    }),
  };

  const jwtServiceMock = {
    sign: jest.fn(() => 'mock-jwt-token'),
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
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('should set Authentication cookie and return token + user payload on login', async () => {
    const res = responseMock() as any;

    const user: any = {
      _id: { toHexString: () => 'user-id-hex' },
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
});
