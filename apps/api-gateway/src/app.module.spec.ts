import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AuthProxyController } from './auth-proxy.controller';
import { UsersProxyController } from './users-proxy.controller';
import { ProductsProxyController } from './products-proxy.controller';
import { JwtStrategy } from '../../auth/src/strategies/jwt.strategy';

// ← mock the entire jwt strategy file so UsersService is never needed
jest.mock('../../auth/src/strategies/jwt.strategy', () => ({
  JwtStrategy: class MockJwtStrategy {
    validate = jest.fn().mockResolvedValue({ userId: '1' });
  },
}));

jest.mock('@nestjs/throttler', () => {
  const originalModule = jest.requireActual('@nestjs/throttler');
  return {
    ...originalModule,
    ThrottlerGuard: class MockThrottlerGuard {
      canActivate() {
        return true;
      }
    },
  };
});

describe('AppModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(JwtStrategy)
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