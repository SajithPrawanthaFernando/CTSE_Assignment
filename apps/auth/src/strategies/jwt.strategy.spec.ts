import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  const usersServiceMock = {
    getUser: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test-secret';
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should validate and return user from UsersService', async () => {
    usersServiceMock.getUser.mockResolvedValueOnce({
      _id: '123',
      email: 'a@b.com',
    });

    const strategy = new JwtStrategy(
      configServiceMock as any,
      usersServiceMock as any,
    );

    const result = await strategy.validate({ userId: '123' } as any);

    expect(usersServiceMock.getUser).toHaveBeenCalledWith({ _id: '123' });
    expect(result).toEqual({ _id: '123', email: 'a@b.com' });
  });

  it('extractor should read token from cookies.Authentication first', () => {
    const strategy = new JwtStrategy(
      configServiceMock as any,
      usersServiceMock as any,
    );

    // Access Passport internals: it stores options with a jwtFromRequest function
    const jwtFromRequest = (strategy as any)._jwtFromRequest;

    const req = { cookies: { Authentication: 'cookie-token' } };
    const token = jwtFromRequest(req);

    expect(token).toBe('cookie-token');
  });

  it('extractor should read token from request.Authentication when no cookie', () => {
    const strategy = new JwtStrategy(
      configServiceMock as any,
      usersServiceMock as any,
    );
    const jwtFromRequest = (strategy as any)._jwtFromRequest;

    const req = { Authentication: 'req-token' };
    const token = jwtFromRequest(req);

    expect(token).toBe('req-token');
  });

  it('extractor should read token from headers.Authentication when no cookie or request.Authentication', () => {
    const strategy = new JwtStrategy(
      configServiceMock as any,
      usersServiceMock as any,
    );
    const jwtFromRequest = (strategy as any)._jwtFromRequest;

    const req = { headers: { Authentication: 'header-token' } };
    const token = jwtFromRequest(req);

    expect(token).toBe('header-token');
  });

  it('extractor should return undefined when token is missing everywhere', () => {
    const strategy = new JwtStrategy(
      configServiceMock as any,
      usersServiceMock as any,
    );
    const jwtFromRequest = (strategy as any)._jwtFromRequest;

    const req = { headers: {} };
    const token = jwtFromRequest(req);

    expect(token).toBeUndefined();
  });
});
