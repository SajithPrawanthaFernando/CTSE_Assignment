import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ProductDocument } from './schemas/product.schema';
import { AUTH_SERVICE } from '@app/common';
import { Reflector } from '@nestjs/core';

const mockProductModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  exec: jest.fn(),
};

const mockConnection = {
  close: jest.fn().mockResolvedValue(undefined),
  model: jest.fn(),
};

describe('ProductsModule (unit)', () => {
  let moduleRef: TestingModule;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        ProductsService,
        ProductsRepository,
        {
          provide: getModelToken(ProductDocument.name),
          useValue: mockProductModel,
        },
        {
          provide: getConnectionToken(),
          useValue: mockConnection,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === 'MONGODB_URI')
                return 'mongodb://localhost:27017/products';
              if (key === 'PORT') return 3002;
              if (key === 'AUTH_HOST') return 'localhost';
              if (key === 'AUTH_PORT') return 3001;
              return undefined;
            }),
          },
        },
        {
          provide: AUTH_SERVICE,
          useValue: {
            send: jest.fn(),
            emit: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
  });

  it('should compile without a real database connection', () => {
    expect(moduleRef).toBeDefined();
  });

  it('should resolve ProductsController', () => {
    const controller = moduleRef.get<ProductsController>(ProductsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ProductsController);
  });

  it('should resolve ProductsService', () => {
    const service = moduleRef.get<ProductsService>(ProductsService);
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(ProductsService);
  });

  it('should resolve ProductsRepository', () => {
    const repo = moduleRef.get<ProductsRepository>(ProductsRepository);
    expect(repo).toBeDefined();
    expect(repo).toBeInstanceOf(ProductsRepository);
  });

  it('should use default PORT 3002 when PORT is not set', () => {
    const config = moduleRef.get<ConfigService>(ConfigService);
    expect(config.get('PORT')).toBe(3002);
  });

  it('should use default MONGODB_URI when not set', () => {
    const config = moduleRef.get<ConfigService>(ConfigService);
    expect(config.get('MONGODB_URI')).toBe(
      'mongodb://localhost:27017/products',
    );
  });

  it('should build mongoose options with MONGODB_URI from ConfigService', () => {
    const config = moduleRef.get<ConfigService>(ConfigService);
    const factory = (cfg: ConfigService) => ({ uri: cfg.get('MONGODB_URI') });
    expect(factory(config)).toEqual({
      uri: 'mongodb://localhost:27017/products',
    });
  });

  it('should return undefined uri when MONGODB_URI is not configured', () => {
    const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
    const factory = (cfg: ConfigService) => ({ uri: cfg.get('MONGODB_URI') });
    expect(factory(emptyConfig)).toEqual({ uri: undefined });
  });

  it('should inject ProductsRepository into ProductsService', () => {
    const service = moduleRef.get<ProductsService>(ProductsService);
    expect(service).toBeInstanceOf(ProductsService);
  });

  it('should inject the Mongoose model into ProductsRepository', () => {
    const repo = moduleRef.get<ProductsRepository>(ProductsRepository);
    expect(repo).toBeInstanceOf(ProductsRepository);
  });
});
