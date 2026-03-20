import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';
import { CartService } from './cart.service';
import { CartRepository } from './cart.repository';
import { OrdersService } from './orders.service';
import { OrderStatus } from './schemas/order.schema';

describe('CartService', () => {
  let service: CartService;
  let repository: CartRepository;
  let httpService: HttpService;
  let ordersService: OrdersService;

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

  const mockProduct = {
    id: 'prod_001',
    name: 'Cheese Burger',
    price: 8.99,
    inStock: true,
  };

  // ← Mock order returned after checkout
  const mockOrder = {
    _id: '607f1f77bcf86cd799439022',
    userId: 'user_123',
    items: [
      {
        productId: 'prod_001',
        quantity: 2,
        unitPrice: 8.99,
        subtotal: 17.98,
      },
    ],
    status: OrderStatus.PENDING,
    totalAmount: 17.98,
    shippingAddress: '123 Main St, City',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: CartRepository,
          useValue: {
            create: jest.fn().mockResolvedValue(mockCart),
            findByUserId: jest.fn().mockResolvedValue(mockCart),
            findOneAndUpdate: jest.fn().mockResolvedValue(mockCart),
            findOneAndDelete: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === 'PRODUCTS_HTTP_BASEURL' ? 'http://products:3002' : undefined,
            ),
          },
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn().mockReturnValue(
              of({ data: mockProduct, status: 200, headers: {}, config: {} as any, statusText: 'OK' }),
            ),
          },
        },
        // ← NEW: Mock OrdersService
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockOrder),
          },
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    repository = module.get<CartRepository>(CartRepository);
    httpService = module.get<HttpService>(HttpService);
    ordersService = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCart', () => {
    it('should return existing cart for user', async () => {
      const result = await service.getCart('user_123');
      expect(result).toEqual(mockCart);
      expect(repository.findByUserId).toHaveBeenCalledWith('user_123');
    });

    it('should create empty cart if not exists', async () => {
      jest.spyOn(repository, 'findByUserId').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockResolvedValue(mockEmptyCart as any);

      const result = await service.getCart('user_123');
      expect(result).toEqual(mockEmptyCart);
      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user_123',
        items: [],
        totalAmount: 0,
      });
    });
  });

  describe('addItem', () => {
    it('should add new item to existing cart', async () => {
      const updatedCart = {
        ...mockCart,
        items: [
          ...mockCart.items,
          { productId: 'prod_002', quantity: 1, unitPrice: 7.49, subtotal: 7.49 },
        ],
        totalAmount: 25.47,
      };
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(updatedCart as any);

      const dto = { productId: 'prod_002', quantity: 1 };
      const result = await service.addItem('user_123', dto);

      expect(result.items.length).toBe(2);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://products:3002/products/prod_002',
        expect.any(Object),
      );
    });

    it('should increase quantity if item already exists in cart', async () => {
      const updatedCart = {
        ...mockCart,
        items: [
          { productId: 'prod_001', quantity: 4, unitPrice: 8.99, subtotal: 35.96 },
        ],
        totalAmount: 35.96,
      };
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(updatedCart as any);

      const dto = { productId: 'prod_001', quantity: 2 };
      const result = await service.addItem('user_123', dto);

      expect(result.items[0].quantity).toBe(4); // ← 2 existing + 2 new
      expect(result.totalAmount).toBe(35.96);
    });

    it('should create new cart with item if no cart exists', async () => {
      jest.spyOn(repository, 'findByUserId').mockResolvedValue(null);
      jest.spyOn(repository, 'create').mockResolvedValue({
        ...mockEmptyCart,
        items: [{ productId: 'prod_001', quantity: 1, unitPrice: 8.99, subtotal: 8.99 }],
        totalAmount: 8.99,
      } as any);

      const dto = { productId: 'prod_001', quantity: 1 };
      const result = await service.addItem('user_123', dto);

      expect(repository.create).toHaveBeenCalled();
      expect(result.items.length).toBe(1);
    });

    it('should throw BadRequestException for invalid product', async () => {
      jest.spyOn(service as any, 'getProductInfo').mockRejectedValue(
        new BadRequestException('Product not found or unavailable: prod_999'),
      );

      const dto = { productId: 'prod_999', quantity: 1 };
      await expect(service.addItem('user_123', dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('updateItem', () => {
    it('should update item quantity in cart', async () => {
      const updatedCart = {
        ...mockCart,
        items: [
          { productId: 'prod_001', quantity: 5, unitPrice: 8.99, subtotal: 44.95 },
        ],
        totalAmount: 44.95,
      };
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(updatedCart as any);

      const dto = { quantity: 5 };
      const result = await service.updateItem('user_123', 'prod_001', dto);

      expect(result.items[0].quantity).toBe(5);
      expect(result.totalAmount).toBe(44.95);
      expect(repository.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cart not found', async () => {
      jest.spyOn(repository, 'findByUserId').mockResolvedValue(null);

      await expect(
        service.updateItem('user_123', 'prod_001', { quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateItem('user_123', 'prod_001', { quantity: 5 }),
      ).rejects.toThrow('Cart not found');
    });

    it('should throw BadRequestException when item not in cart', async () => {
      await expect(
        service.updateItem('user_123', 'prod_999', { quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateItem('user_123', 'prod_999', { quantity: 5 }),
      ).rejects.toThrow('Item not found in cart: prod_999');
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(mockEmptyCart as any);

      const result = await service.removeItem('user_123', 'prod_001');

      expect(result.items.length).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(repository.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw BadRequestException when cart not found', async () => {
      jest.spyOn(repository, 'findByUserId').mockResolvedValue(null);

      await expect(
        service.removeItem('user_123', 'prod_001'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.removeItem('user_123', 'prod_001'),
      ).rejects.toThrow('Cart not found');
    });

    it('should keep other items when removing one item', async () => {
      const cartWithTwoItems = {
        ...mockCart,
        items: [
          { productId: 'prod_001', quantity: 2, unitPrice: 8.99, subtotal: 17.98 },
          { productId: 'prod_005', quantity: 1, unitPrice: 2.49, subtotal: 2.49 },
        ],
        totalAmount: 20.47,
      };
      const cartAfterRemove = {
        ...mockCart,
        items: [
          { productId: 'prod_005', quantity: 1, unitPrice: 2.49, subtotal: 2.49 },
        ],
        totalAmount: 2.49,
      };

      jest.spyOn(repository, 'findByUserId').mockResolvedValue(cartWithTwoItems as any);
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(cartAfterRemove as any);

      const result = await service.removeItem('user_123', 'prod_001');

      expect(result.items.length).toBe(1);
      expect(result.items[0].productId).toBe('prod_005');
    });
  });

  describe('clearCart', () => {
    it('should clear all items from cart', async () => {
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(mockEmptyCart as any);

      const result = await service.clearCart('user_123');

      expect(result.items.length).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user_123' },
        { $set: { items: [], totalAmount: 0 } },
      );
    });
  });

  // ← NEW: Updated checkout tests
  describe('checkout', () => {
    it('should create order and clear cart', async () => {
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(mockEmptyCart as any);

      const result = await service.checkout('user_123', '123 Main St, City');

      // ← Verify order was created
      expect(ordersService.create).toHaveBeenCalledWith(
        {
          items: [{ productId: 'prod_001', quantity: 2 }],
          shippingAddress: '123 Main St, City',
        },
        'user_123',
      );

      // ← Verify cart was cleared
      expect(repository.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user_123' },
        { $set: { items: [], totalAmount: 0 } },
      );

      // ← Verify order returned
      expect(result).toEqual(mockOrder);
      expect(result.status).toBe(OrderStatus.PENDING);
    });

    it('should create order without shipping address', async () => {
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(mockEmptyCart as any);

      await service.checkout('user_123');

      expect(ordersService.create).toHaveBeenCalledWith(
        {
          items: [{ productId: 'prod_001', quantity: 2 }],
          shippingAddress: undefined,
        },
        'user_123',
      );
    });

    it('should throw BadRequestException when cart is empty', async () => {
      jest.spyOn(repository, 'findByUserId').mockResolvedValue(mockEmptyCart as any);

      await expect(service.checkout('user_123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.checkout('user_123')).rejects.toThrow(
        'Cart is empty',
      );
    });

    it('should throw BadRequestException when cart not found', async () => {
      jest.spyOn(repository, 'findByUserId').mockResolvedValue(null);

      await expect(service.checkout('user_123')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.checkout('user_123')).rejects.toThrow(
        'Cart is empty',
      );
    });

    it('should not clear cart if order creation fails', async () => {
      jest.spyOn(ordersService, 'create').mockRejectedValue(
        new BadRequestException('Product unavailable'),
      );

      await expect(
        service.checkout('user_123', '123 Main St'),
      ).rejects.toThrow(BadRequestException);

      // ← Cart should NOT be cleared if order fails
      expect(repository.findOneAndUpdate).not.toHaveBeenCalledWith(
        { userId: 'user_123' },
        { $set: { items: [], totalAmount: 0 } },
      );
    });
  });
});