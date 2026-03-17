import { Test, TestingModule } from '@nestjs/testing';
import { AppModule, GatewayJwtStrategy } from './app.module'; // ← import GatewayJwtStrategy
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

describe('AppModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GatewayJwtStrategy) // ← override inline strategy
      .useValue({ validate: jest.fn().mockResolvedValue({ userId: '1' }) })
      .compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('should compile the module', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should register AuthProxyController', () => {
    const controller = moduleRef.get<AuthProxyController>(AuthProxyController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(AuthProxyController);
  });

  it('should register UsersProxyController', () => {
    const controller =
      moduleRef.get<UsersProxyController>(UsersProxyController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(UsersProxyController);
  });
});
