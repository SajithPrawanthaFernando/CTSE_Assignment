import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { CartProxyController } from './cart-proxy.controller';

describe('CartProxyController', () => {
  let controller: CartProxyController;
  let httpService: HttpService;

  const mockCart = {
    _id: '507f1f77bcf86cd799439011',
    userId: 'user_123',
    items: [
      {
        productId: 'prod_001',
        quantity: 2,
        unitPrice: 8.99,
        subtotal: 17.98,
        name: 'Cheese Burger',
      },
    ],
    totalAmount: 17.98,
  };

  const mockEmptyCart = {
    _id: '507f1f77bcf86cd799439011',
    userId: 'user_123',
    items: [],
    totalAmount: 0,
  };

  const mockReq = {
    headers: {
      authorization: 'Bearer mock_token',
      cookie: '',
    },
  } as any;

  const mockRes = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as any;

  beforeEach(async () => {
    process.env.ORDERS_HTTP_BASEURL = 'http://localhost:3003';

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
      ],
    }).compile();

    controller = module.get<CartProxyController>(CartProxyController);
    httpService = module.get<HttpService>(HttpService);

    jest.clearAllMocks();
    mockRes.status = jest.fn().mockReturnThis();
    mockRes.json = jest.fn().mockReturnThis();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart', () => {
    it('should forward GET my-cart request with JWT token', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: mockCart, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.getCart(mockReq, mockRes);

      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3003/cart/my-cart',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer mock_token',
          }),
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCart);
    });

    it('should return 401 when no token provided', async () => {
      jest.spyOn(httpService, 'get').mockReturnValue(
        of({ data: { message: 'Unauthorized' }, status: 401, headers: {}, config: {} as any, statusText: 'Unauthorized' }),
      );

      const noAuthReq = { headers: { authorization: '', cookie: '' } } as any;
      await controller.getCart(noAuthReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('addItem', () => {
    it('should forward POST items request to cart service', async () => {
      const body = { productId: 'prod_001', quantity: 2 };
      const updatedCart = {
        ...mockEmptyCart,
        items: [{ productId: 'prod_001', quantity: 2, unitPrice: 8.99, subtotal: 17.98 }],
        totalAmount: 17.98,
      };

      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: updatedCart, status: 201, headers: {}, config: {} as any, statusText: 'Created' }),
      );

      await controller.addItem(body, mockReq, mockRes);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3003/cart/items',
        body,
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer mock_token',
          }),
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(updatedCart);
    });

    it('should return 400 for invalid product', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: { message: 'Product not found: prod_999' }, status: 400, headers: {}, config: {} as any, statusText: 'Bad Request' }),
      );

      await controller.addItem({ productId: 'prod_999', quantity: 1 }, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when no token provided', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: { message: 'Unauthorized' }, status: 401, headers: {}, config: {} as any, statusText: 'Unauthorized' }),
      );

      const noAuthReq = { headers: { authorization: '', cookie: '' } } as any;
      await controller.addItem({}, noAuthReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('updateItem', () => {
    it('should forward PATCH items/:productId request to cart service', async () => {
      const body = { quantity: 5 };
      const updatedCart = {
        ...mockCart,
        items: [{ productId: 'prod_001', quantity: 5, unitPrice: 8.99, subtotal: 44.95 }],
        totalAmount: 44.95,
      };

      jest.spyOn(httpService, 'patch').mockReturnValue(
        of({ data: updatedCart, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.updateItem('prod_001', body, mockReq, mockRes);

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://localhost:3003/cart/items/prod_001',
        body,
        expect.any(Object),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(updatedCart);
    });

    it('should return 400 when item not in cart', async () => {
      jest.spyOn(httpService, 'patch').mockReturnValue(
        of({ data: { message: 'Item not found in cart: prod_999' }, status: 400, headers: {}, config: {} as any, statusText: 'Bad Request' }),
      );

      await controller.updateItem('prod_999', { quantity: 3 }, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when no token provided', async () => {
      jest.spyOn(httpService, 'patch').mockReturnValue(
        of({ data: { message: 'Unauthorized' }, status: 401, headers: {}, config: {} as any, statusText: 'Unauthorized' }),
      );

      const noAuthReq = { headers: { authorization: '', cookie: '' } } as any;
      await controller.updateItem('prod_001', {}, noAuthReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('removeItem', () => {
    it('should forward DELETE items/:productId request to cart service', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: mockEmptyCart, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.removeItem('prod_001', mockReq, mockRes);

      expect(httpService.delete).toHaveBeenCalledWith(
        'http://localhost:3003/cart/items/prod_001',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer mock_token',
          }),
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockEmptyCart);
    });

    it('should return 400 when item not in cart', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: { message: 'Item not found in cart: prod_999' }, status: 400, headers: {}, config: {} as any, statusText: 'Bad Request' }),
      );

      await controller.removeItem('prod_999', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when no token provided', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: { message: 'Unauthorized' }, status: 401, headers: {}, config: {} as any, statusText: 'Unauthorized' }),
      );

      const noAuthReq = { headers: { authorization: '', cookie: '' } } as any;
      await controller.removeItem('prod_001', noAuthReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('clearCart', () => {
    it('should forward DELETE /cart request to cart service', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: mockEmptyCart, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.clearCart(mockReq, mockRes);

      expect(httpService.delete).toHaveBeenCalledWith(
        'http://localhost:3003/cart',
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer mock_token',
          }),
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockEmptyCart);
    });

    it('should return 401 when no token provided', async () => {
      jest.spyOn(httpService, 'delete').mockReturnValue(
        of({ data: { message: 'Unauthorized' }, status: 401, headers: {}, config: {} as any, statusText: 'Unauthorized' }),
      );

      const noAuthReq = { headers: { authorization: '', cookie: '' } } as any;
      await controller.clearCart(noAuthReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });

  describe('checkout', () => {
    it('should forward POST checkout request to cart service', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: mockCart, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
      );

      await controller.checkout({}, mockReq, mockRes);

      expect(httpService.post).toHaveBeenCalledWith(
        'http://localhost:3003/cart/checkout',
        {},
        expect.objectContaining({
          headers: expect.objectContaining({
            authorization: 'Bearer mock_token',
          }),
        }),
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(mockCart);
    });

    it('should return 400 when cart is empty', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: { message: 'Cart is empty' }, status: 400, headers: {}, config: {} as any, statusText: 'Bad Request' }),
      );

      await controller.checkout({}, mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 when no token provided', async () => {
      jest.spyOn(httpService, 'post').mockReturnValue(
        of({ data: { message: 'Unauthorized' }, status: 401, headers: {}, config: {} as any, statusText: 'Unauthorized' }),
      );

      const noAuthReq = { headers: { authorization: '', cookie: '' } } as any;
      await controller.checkout({}, noAuthReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});