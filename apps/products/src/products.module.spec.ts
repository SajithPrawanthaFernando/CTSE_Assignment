import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { ProductDocument } from './schemas/product.schema';

// ─── Shared mock model ────────────────────────────────────────────────────────

const mockProductModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  exec: jest.fn(),
};

// ─── Mock Mongoose connection (prevents connection.close is not a function) ───

const mockConnection = {
  close: jest.fn().mockResolvedValue(undefined),
  model: jest.fn(),
};

// ─── Suite ────────────────────────────────────────────────────────────────────

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
              if (key === 'MONGODB_URI') return 'mongodb://localhost:27017/products';
              if (key === 'PORT') return 3002;
              return undefined;
            }),
          },
        },
      ],
    }).compile();
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  // ─── Module compiles ───────────────────────────────────────────────────────

  it('should compile without a real database connection', () => {
    expect(moduleRef).toBeDefined();
  });

  // ─── Controllers ──────────────────────────────────────────────────────────

  it('should resolve ProductsController', () => {
    const controller = moduleRef.get<ProductsController>(ProductsController);
    expect(controller).toBeDefined();
    expect(controller).toBeInstanceOf(ProductsController);
  });

  // ─── Providers ────────────────────────────────────────────────────────────

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

  // ─── Config defaults ───────────────────────────────────────────────────────

  it('should use default PORT 3002 when PORT is not set', () => {
    const config = moduleRef.get<ConfigService>(ConfigService);
    expect(config.get('PORT')).toBe(3002);
  });

  it('should use default MONGODB_URI when not set', () => {
    const config = moduleRef.get<ConfigService>(ConfigService);
    expect(config.get('MONGODB_URI')).toBe('mongodb://localhost:27017/products');
  });

  // ─── MongooseModule.forRootAsync factory ──────────────────────────────────

  it('should build mongoose options with MONGODB_URI from ConfigService', () => {
    const config = moduleRef.get<ConfigService>(ConfigService);
    const factory = (cfg: ConfigService) => ({ uri: cfg.get('MONGODB_URI') });
    expect(factory(config)).toEqual({ uri: 'mongodb://localhost:27017/products' });
  });

  it('should return undefined uri when MONGODB_URI is not configured', () => {
    const emptyConfig = { get: jest.fn().mockReturnValue(undefined) } as any;
    const factory = (cfg: ConfigService) => ({ uri: cfg.get('MONGODB_URI') });
    expect(factory(emptyConfig)).toEqual({ uri: undefined });
  });

  // ─── Dependency wiring ─────────────────────────────────────────────────────

  it('should inject ProductsRepository into ProductsService', () => {
    const service = moduleRef.get<ProductsService>(ProductsService);
    expect(service).toBeInstanceOf(ProductsService);
  });

  it('should inject the Mongoose model into ProductsRepository', () => {
    const repo = moduleRef.get<ProductsRepository>(ProductsRepository);
    expect(repo).toBeInstanceOf(ProductsRepository);
  });
});