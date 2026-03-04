import { Test, TestingModule } from '@nestjs/testing';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

describe('AuthModule', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AuthModule],
    }).compile();
  });

  it('should compile the module', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should provide AuthService', () => {
    const service = moduleRef.get<AuthService>(AuthService);
    expect(service).toBeDefined();
  });

  it('should provide AuthController', () => {
    const controller = moduleRef.get<AuthController>(AuthController);
    expect(controller).toBeDefined();
  });

  it('should export AuthService', () => {
    const service = moduleRef.get<AuthService>(AuthService);
    expect(service).toBeInstanceOf(AuthService);
  });
});
