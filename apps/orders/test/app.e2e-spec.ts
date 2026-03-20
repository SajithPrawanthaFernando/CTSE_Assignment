import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { OrdersModule } from '../src/orders.module';
import { OrdersService } from '../src/orders.service';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OrdersModule],
    })
      .overrideProvider(OrdersService)
      .useValue({
        create: jest.fn().mockResolvedValue({
          _id: '1',
          userId: 'u1',
          items: [],
          status: 'PENDING',
          totalAmount: 0,
        }),
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
        findByUserId: jest.fn().mockResolvedValue([]),
        updateStatus: jest.fn().mockResolvedValue(null),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/orders (GET) returns 200', () => {
    return request(app.getHttpServer()).get('/orders').expect(200);
  });

  afterEach(async () => {
    await app?.close();
  });
});
