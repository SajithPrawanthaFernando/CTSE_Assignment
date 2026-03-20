import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { OrdersProxyController } from './orders-proxy.controller';
import { OrderStatus } from '../../orders/src/schemas/order.schema';

describe('OrdersProxyController', () => {
  let controller: OrdersProxyController;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockOrder = {
    _id: '507f1f77bcf86cd799439011',
    userId: 'user_123',
    items: [
      { productId: 'prod_001', quantity: 2, unitPrice: 8.99, subtotal: 17.98 },
    ],
    status: OrderStatus.PENDING,
    totalAmount: 17.98,
    shippingAddress: '123 Main St, City',
  };

  const mockReq = {
    headers: {
      authorization: 'Bearer mock_token',
      cookie: 'session=123',
    },
  } as any;

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersProxyController],
      providers: [
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:3003'),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersProxyController>(OrdersProxyController);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should return the configured base URL from ConfigService', () => {
    expect((controller as any).base()).toBe('http://localhost:3003');
  });

  it('should fallback to default URL if ConfigService returns nothing', () => {
    jest.spyOn(configService, 'get').mockReturnValue(null);
    expect((controller as any).base()).toBe('http://localhost:3003');
  });

  it('should correctly forward authorization and cookie headers', () => {
    const headers = (controller as any).forwardHeaders(mockReq);
    expect(headers).toEqual({
      authorization: 'Bearer mock_token',
      cookie: 'session=123',
    });
  });

  it('should fallback to empty strings if headers are missing', () => {
    const emptyReq = { headers: {} } as any;
    const headers = (controller as any).forwardHeaders(emptyReq);
    expect(headers).toEqual({ authorization: '', cookie: '' });
  });

  describe('create', () => {
    it('should forward POST request with headers', async () => {
      const body = { items: [] };
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: mockOrder, status: 201 }));

      await controller.create(body, mockReq, mockRes);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3003/orders',
        body,
        expect.objectContaining({
          headers: {
            authorization: 'Bearer mock_token',
            cookie: 'session=123',
          },
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('findAll', () => {
    it('should forward GET request', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: [mockOrder], status: 200 }));

      await controller.findAll(mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/orders',
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getMyOrders', () => {
    it('should forward GET my-orders request', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: [mockOrder], status: 200 }));

      await controller.getMyOrders(mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/orders/my-orders',
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('findByUserId', () => {
    it('should forward GET request with userId param', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: [mockOrder], status: 200 }));

      await controller.findByUserId('user123', mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/orders/by-user/user123',
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('findOne', () => {
    it('should forward GET request with id param', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: mockOrder, status: 200 }));

      await controller.findOne('order123', mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/orders/order123',
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('update', () => {
    it('should forward PATCH request with body', async () => {
      const body = { shippingAddress: 'New Address' };
      jest
        .spyOn(httpService, 'patch')
        .mockReturnValue(of({ data: mockOrder, status: 200 }));

      await controller.update('order123', body, mockReq, mockRes);

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://localhost:3003/orders/order123',
        body,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('updateStatus', () => {
    it('should forward PATCH request to status endpoint', async () => {
      const body = { status: OrderStatus.CONFIRMED };
      jest
        .spyOn(httpService, 'patch')
        .mockReturnValue(of({ data: mockOrder, status: 200 }));

      await controller.updateStatus('order123', body, mockReq, mockRes);

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://localhost:3003/orders/order123/status',
        body,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('remove', () => {
    it('should forward DELETE request', async () => {
      jest
        .spyOn(httpService, 'delete')
        .mockReturnValue(of({ data: null, status: 204 }));

      await controller.remove('order123', mockReq, mockRes);

      expect(httpService.delete).toHaveBeenCalledWith(
        'http://localhost:3003/orders/order123',
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });
  });
});
