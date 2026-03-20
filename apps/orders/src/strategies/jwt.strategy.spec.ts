import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_SECRET') return 'test_secret';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object with userId from payload.userId', async () => {
      const payload = {
        userId: 'user_123',
        email: 'user@example.com',
        roles: ['user'],
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user_123',
        email: 'user@example.com',
        roles: ['user'],
      });
    });

    it('should return user object with userId from payload.sub', async () => {
      const payload = {
        sub: 'user_123', // ← sub instead of userId
        email: 'user@example.com',
        roles: ['user'],
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'user_123',
        email: 'user@example.com',
        roles: ['user'],
      });
    });

    it('should prefer sub over userId when both present', async () => {
      const payload = {
        sub: 'sub_id',
        userId: 'user_id',
        email: 'user@example.com',
        roles: ['user'],
      };

      const result = await strategy.validate(payload);

      expect(result.userId).toBe('sub_id'); // ← sub takes priority
    });

    it('should return admin role correctly', async () => {
      const payload = {
        userId: 'admin_123',
        email: 'admin@example.com',
        roles: ['admin'],
      };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 'admin_123',
        email: 'admin@example.com',
        roles: ['admin'],
      });
      expect(result.roles).toContain('admin');
    });

    it('should return multiple roles correctly', async () => {
      const payload = {
        userId: 'user_123',
        email: 'user@example.com',
        roles: ['user', 'admin'], // ← multiple roles
      };

      const result = await strategy.validate(payload);

      expect(result.roles).toHaveLength(2);
      expect(result.roles).toContain('user');
      expect(result.roles).toContain('admin');
    });

    it('should default to empty array when roles not present', async () => {
      const payload = {
        userId: 'user_123',
        email: 'user@example.com',
        // ← no roles field
      };

      const result = await strategy.validate(payload);

      expect(result.roles).toEqual([]); // ← defaults to empty array
    });

    it('should default to empty array when roles is null', async () => {
      const payload = {
        userId: 'user_123',
        email: 'user@example.com',
        roles: null, // ← null roles
      };

      const result = await strategy.validate(payload);

      expect(result.roles).toEqual([]); // ← defaults to empty array
    });

    it('should handle payload with only sub field', async () => {
      const payload = {
        sub: 'user_123',
        email: 'user@example.com',
      };

      const result = await strategy.validate(payload);

      expect(result.userId).toBe('user_123');
      expect(result.roles).toEqual([]);
    });

    it('should include email in returned object', async () => {
      const payload = {
        userId: 'user_123',
        email: 'test@example.com',
        roles: ['user'],
      };

      const result = await strategy.validate(payload);

      expect(result.email).toBe('test@example.com');
    });
  });
});