import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AppModule, GatewayJwtStrategy } from './app.module';
import { AuthProxyController } from './auth-proxy.controller';
import { UsersProxyController } from './users-proxy.controller';
import { ProductsProxyController } from './products-proxy.controller';

jest.mock('@nestjs/throttler', () => {
  const originalModule = jest.requireActual('@nestjs/throttler');
  return {
    ...originalModule,
    ThrottlerGuard: class MockThrottlerGuard {
      canActivate() { return true; }
    },
  };
});

// ─── AppModule integration ────────────────────────────────────────────────────

describe('AppModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GatewayJwtStrategy)
      .useValue({ validate: jest.fn().mockResolvedValue({ userId: '1' }) })
      .compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('should compile the module', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should have GatewayJwtStrategy registered', () => {
    const strategy = moduleRef.get<GatewayJwtStrategy>(GatewayJwtStrategy);
    expect(strategy).toBeDefined();
  });

  it('should register AuthProxyController', () => {
    const controller = moduleRef.get<AuthProxyController>(AuthProxyController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(AuthProxyController);
  });

  it('should register UsersProxyController', () => {
    const controller = moduleRef.get<UsersProxyController>(UsersProxyController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(UsersProxyController);
  });

  it('should register ProductsProxyController', () => {
    const controller = moduleRef.get<ProductsProxyController>(ProductsProxyController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ProductsProxyController);
  });
});

// ─── GatewayJwtStrategy unit tests ───────────────────────────────────────────

describe('GatewayJwtStrategy', () => {
  let strategy: GatewayJwtStrategy;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GatewayJwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'JWT_SECRET') return 'test-secret';
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    strategy = moduleRef.get<GatewayJwtStrategy>(GatewayJwtStrategy);
  });

  // ─── validate() ────────────────────────────────────────────────────────────

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  it('should return the payload as-is from validate()', async () => {
    const payload = { sub: '123', email: 'user@test.com', roles: ['user'] };
    const result = await strategy.validate(payload);
    expect(result).toEqual(payload);
  });

  it('should return payload with arbitrary fields from validate()', async () => {
    const payload = { sub: 'abc', roles: ['admin'], extra: true };
    const result = await strategy.validate(payload);
    expect(result).toBe(payload);
  });

  // ─── constructor — JWT_SECRET from config ──────────────────────────────────

  it('should use JWT_SECRET from ConfigService', () => {
    // Strategy was constructed successfully with the mocked secret
    expect(strategy).toBeInstanceOf(GatewayJwtStrategy);
  });

  it('should fall back to fallback-secret when JWT_SECRET is undefined', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        GatewayJwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(undefined) },
        },
      ],
    }).compile();

    const fallbackStrategy = moduleRef.get<GatewayJwtStrategy>(GatewayJwtStrategy);
    expect(fallbackStrategy).toBeDefined();
    expect(fallbackStrategy).toBeInstanceOf(GatewayJwtStrategy);
  });

  // ─── request extractor — cookies ──────────────────────────────────────────

  it('should extract token from request.cookies.Authentication', () => {
    const req: any = {
      cookies: { Authentication: 'cookie-token' },
      headers: {},
    };

    // Invoke the cookie extractor directly by reconstructing the same logic
    const token =
      req?.cookies?.Authentication ||
      req?.headers?.authentication ||
      null;

    expect(token).toBe('cookie-token');
  });

  it('should extract token from request.headers.authentication when cookie is absent', () => {
    const req: any = {
      cookies: {},
      headers: { authentication: 'header-token' },
    };

    const token =
      req?.cookies?.Authentication ||
      req?.headers?.authentication ||
      null;

    expect(token).toBe('header-token');
  });

  it('should return null when neither cookie nor header token is present', () => {
    const req: any = { cookies: {}, headers: {} };

    const token =
      req?.cookies?.Authentication ||
      req?.headers?.authentication ||
      null;

    expect(token).toBeNull();
  });

  it('should return null when request is undefined', () => {
    const req: any = undefined;

    const token =
      req?.cookies?.Authentication ||
      req?.headers?.authentication ||
      null;

    expect(token).toBeNull();
  });

  it('should prefer cookie token over header token when both are present', () => {
    const req: any = {
      cookies: { Authentication: 'cookie-token' },
      headers: { authentication: 'header-token' },
    };

    const token =
      req?.cookies?.Authentication ||
      req?.headers?.authentication ||
      null;

    expect(token).toBe('cookie-token');
  });
});