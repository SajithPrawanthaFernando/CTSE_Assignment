import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { AuthProxyController } from './auth-proxy.controller';
import { UsersProxyController } from './users-proxy.controller';

// 1. Intercept and mock the ThrottlerGuard to remove its dependencies
jest.mock('@nestjs/throttler', () => {
  const originalModule = jest.requireActual('@nestjs/throttler');
  return {
    ...originalModule,
    ThrottlerGuard: class MockThrottlerGuard {
      canActivate() {
        return true; // Bypass the guard completely for these tests
      }
    },
  };
});

describe('AppModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    // 2. Simply import the module now. No overrides needed!
    moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
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
