import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { OrdersProxyController } from './orders-proxy.controller';
import { OrderStatus } from '../../orders/src/schemas/order.schema';

describe('OrdersProxyController', () => {
  let controller: OrdersProxyController;
  let httpService: HttpService;

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

  // ← Mock request object with JWT token
  const mockReq = {
    headers: {
      authorization: 'Bearer mock_token',
      cookie: '',
    },
  } as any;

  // ← Mock response object
  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;

  beforeEach(async () => {
    // ← Set env variable for base URL
    process.env.ORDERS_HTTP_BASEURL = 'http://localhost:3003';

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
      ],
    }).compile();

    controller = module.get<OrdersProxyController>(OrdersProxyController);
    httpService = module.get<HttpService>(HttpService);

    // ← Reset mock response before each test
    jest.clearAllMocks();
    mockRes.status = jest.fn().mockReturnThis();
    mockRes.json = jest.fn().mockReturnThis();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should forward POST request to orders service', async () => {
      const body = {
        items: [{ productId: 'prod_001', quantity: 2 }],
        shippingAddress: '123 Main St, City',
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockOrder, status: 201, headers: {}, config: {} as any, statusText: 'Created' }),
      );

      await controller.create(body, mockReq, mockRes);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3003/orders',
        body,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockOrder);
    });
  });

  describe('findAll', () => {
    it('should forward GET request to orders service', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: [mockOrder], status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.findAll(mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/orders',
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([mockOrder]);
    });
  });

  describe('getMyOrders', () => {
    it('should forward GET my-orders request with JWT token', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: [mockOrder], status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.getMyOrders(mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/orders/my-orders',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer mock_token', // ← JWT token forwarded
          }),
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([mockOrder]);
    });
  });

  describe('findByUserId', () => {
    it('should forward GET by-user request to orders service', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: [mockOrder], status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.findByUserId('user_123', mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/orders/by-user/user_123',
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith([mockOrder]);
    });
  });

  describe('findOne', () => {
    it('should forward GET /:id request to orders service', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: mockOrder, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.findOne(mockOrder._id, mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        `http://localhost:3003/orders/${mockOrder._id}`,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockOrder);
    });

    it('should return 404 when order not found', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: { message: 'Document was not found' }, status: 404, headers: {}, config: {} as any, statusText: 'Not Found' }),
      );

      await controller.findOne('nonexistent_id', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });

  describe('updateStatus', () => {
    it('should forward PATCH /:id/status request to orders service', async () => {
      const updatedOrder = { ...mockOrder, status: OrderStatus.CONFIRMED };
      const body = { status: OrderStatus.CONFIRMED };

      jest.spyOn(httpService, 'patch').mockReturnValue(
        of({ data: updatedOrder, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.updateStatus(mockOrder._id, body, mockReq, mockRes);

      expect(httpService.patch).toHaveBeenCalledWith(
        `http://localhost:3003/orders/${mockOrder._id}/status`,
        body,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedOrder);
    });
  });

  describe('remove', () => {
    it('should forward DELETE /:id request to orders service', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: {}, status: 204, headers: {}, config: {} as any, statusText: 'No Content' }),
      );

      await controller.remove(mockOrder._id, mockReq, mockRes);

      expect(httpService.delete).toHaveBeenCalledWith(
        `http://localhost:3003/orders/${mockOrder._id}`,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('should return 404 when order to delete not found', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: { message: 'Document was not found' }, status: 404, headers: {}, config: {} as any, statusText: 'Not Found' }),
      );

      await controller.remove('nonexistent_id', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should return 401 when no token provided', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: { message: 'Unauthorized' }, status: 401, headers: {}, config: {} as any, statusText: 'Unauthorized' }),
      );

      const noAuthReq = { headers: { authorization: '', cookie: '' } } as any;
      await controller.remove(mockOrder._id, noAuthReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});