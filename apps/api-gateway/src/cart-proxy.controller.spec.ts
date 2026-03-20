import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { CartProxyController } from './cart-proxy.controller';

describe('CartProxyController', () => {
  let controller: CartProxyController;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockCart = {
    _id: '507f1f77bcf86cd799439011',
    userId: 'user_123',
    items: [
      { productId: 'prod_001', quantity: 2, unitPrice: 8.99, subtotal: 17.98 },
    ],
    totalAmount: 17.98,
  };

  const mockReq = {
    headers: {
      authorization: 'Bearer mock_token',
      cookie: 'test-cookie',
    },
  } as any;

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartProxyController],
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

    controller = module.get<CartProxyController>(CartProxyController);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('Utility Methods (Private)', () => {
    it('should return the base URL from config', () => {
      expect((controller as any).base()).toBe('http://localhost:3003');
    });

    it('should fallback to default base URL if config is missing', () => {
      jest.spyOn(configService, 'get').mockReturnValue(null);
      expect((controller as any).base()).toBe('http://localhost:3003');
    });

    it('should forward provided headers correctly', () => {
      const headers = (controller as any).forwardHeaders(mockReq);
      expect(headers).toEqual({
        authorization: 'Bearer mock_token',
        cookie: 'test-cookie',
      });
    });

    it('should use empty strings when headers are missing', () => {
      const emptyReq = { headers: {} } as any;
      const headers = (controller as any).forwardHeaders(emptyReq);
      expect(headers).toEqual({ authorization: '', cookie: '' });
    });
  });

  describe('getCart', () => {
    it('should forward GET /my-cart request', async () => {
      jest
        .spyOn(httpService, 'get')
        .mockReturnValue(of({ data: mockCart, status: 200 }));
      await controller.getCart(mockReq, mockRes);
      expect(httpService.get).toHaveBeenCalledWith(
        expect.stringContaining('/cart/my-cart'),
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('addItem', () => {
    it('should forward POST /items request', async () => {
      const body = { productId: 'p1', quantity: 1 };
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: mockCart, status: 201 }));
      await controller.addItem(body, mockReq, mockRes);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/cart/items'),
        body,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  describe('updateItem', () => {
    it('should forward PATCH /items/:productId request', async () => {
      const body = { quantity: 5 };
      jest
        .spyOn(httpService, 'patch')
        .mockReturnValue(of({ data: mockCart, status: 200 }));
      await controller.updateItem('p1', body, mockReq, mockRes);
      expect(httpService.patch).toHaveBeenCalledWith(
        expect.stringContaining('/cart/items/p1'),
        body,
        expect.any(Object),
      );
    });
  });

  describe('removeItem', () => {
    it('should forward DELETE /items/:productId request', async () => {
      jest
        .spyOn(httpService, 'delete')
        .mockReturnValue(of({ data: {}, status: 200 }));
      await controller.removeItem('p1', mockReq, mockRes);
      expect(httpService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/cart/items/p1'),
        expect.any(Object),
      );
    });
  });

  describe('clearCart', () => {
    it('should forward DELETE /cart request', async () => {
      jest
        .spyOn(httpService, 'delete')
        .mockReturnValue(of({ data: {}, status: 200 }));
      await controller.clearCart(mockReq, mockRes);
      expect(httpService.delete).toHaveBeenCalledWith(
        expect.stringContaining('/cart'),
        expect.any(Object),
      );
    });
  });

  describe('checkout', () => {
    it('should forward POST /checkout request', async () => {
      const body = { address: 'test' };
      jest
        .spyOn(httpService, 'post')
        .mockReturnValue(of({ data: { orderId: '1' }, status: 200 }));
      await controller.checkout(body, mockReq, mockRes);
      expect(httpService.post).toHaveBeenCalledWith(
        expect.stringContaining('/cart/checkout'),
        body,
        expect.any(Object),
      );
    });
  });
});
