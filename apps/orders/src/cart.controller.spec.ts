import { Test, TestingModule } from '@nestjs/testing';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { OrderStatus } from './schemas/order.schema';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Role } from './decorators/roles.decorator';

describe('CartController', () => {
  let controller: CartController;
  let service: CartService;

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

  // ← Updated: includes roles
  const mockRequest = {
    user: {
      userId: 'user_123',
      sub: 'user_123',
      roles: [Role.USER], // ← added roles
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CartController],
      providers: [
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn().mockResolvedValue(mockCart),
            addItem: jest.fn().mockResolvedValue({
              ...mockCart,
              items: [
                ...mockCart.items,
                {
                  productId: 'prod_002',
                  quantity: 1,
                  unitPrice: 7.49,
                  subtotal: 7.49,
                },
              ],
              totalAmount: 25.47,
            }),
            updateItem: jest.fn().mockResolvedValue({
              ...mockCart,
              items: [
                {
                  productId: 'prod_001',
                  quantity: 5,
                  unitPrice: 8.99,
                  subtotal: 44.95,
                },
              ],
              totalAmount: 44.95,
            }),
            removeItem: jest.fn().mockResolvedValue(mockEmptyCart),
            clearCart: jest.fn().mockResolvedValue(mockEmptyCart),
            checkout: jest.fn().mockResolvedValue(mockOrder),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard) // ← added: bypass RolesGuard in tests
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CartController>(CartController);
    service = module.get<CartService>(CartService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getCart', () => {
    it('should return cart for logged in user', async () => {
      const result = await controller.getCart(mockRequest as any);
      expect(result).toEqual(mockCart);
      expect(service.getCart).toHaveBeenCalledWith('user_123');
    });

    it('should use sub if userId not present in token', async () => {
      const reqWithSub = { user: { sub: 'user_123', roles: [Role.USER] } };
      const result = await controller.getCart(reqWithSub as any);
      expect(result).toEqual(mockCart);
      expect(service.getCart).toHaveBeenCalledWith('user_123');
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        CartController.prototype.getCart,
      );
      expect(roles).toBeUndefined(); // ← accessible to all logged in users
    });
  });

  describe('addItem', () => {
    it('should add item to cart', async () => {
      const dto = { productId: 'prod_002', quantity: 1 };
      const result = await controller.addItem(mockRequest as any, dto);
      expect(result.items.length).toBe(2);
      expect(service.addItem).toHaveBeenCalledWith('user_123', dto);
    });

    it('should add item with correct userId from token', async () => {
      const dto = { productId: 'prod_001', quantity: 2 };
      await controller.addItem(mockRequest as any, dto);
      expect(service.addItem).toHaveBeenCalledWith('user_123', dto);
    });

    it('should use sub if userId not present in token', async () => {
      const reqWithSub = { user: { sub: 'user_123', roles: [Role.USER] } };
      const dto = { productId: 'prod_001', quantity: 1 };
      await controller.addItem(reqWithSub as any, dto);
      expect(service.addItem).toHaveBeenCalledWith('user_123', dto);
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        CartController.prototype.addItem,
      );
      expect(roles).toBeUndefined();
    });
  });

  describe('updateItem', () => {
    it('should update item quantity in cart', async () => {
      const dto = { quantity: 5 };
      const result = await controller.updateItem(
        mockRequest as any,
        'prod_001',
        dto,
      );
      expect(result.items[0].quantity).toBe(5);
      expect(result.totalAmount).toBe(44.95);
      expect(service.updateItem).toHaveBeenCalledWith(
        'user_123',
        'prod_001',
        dto,
      );
    });

    it('should call updateItem with correct params', async () => {
      const dto = { quantity: 3 };
      await controller.updateItem(mockRequest as any, 'prod_001', dto);
      expect(service.updateItem).toHaveBeenCalledWith(
        'user_123',
        'prod_001',
        dto,
      );
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        CartController.prototype.updateItem,
      );
      expect(roles).toBeUndefined();
    });
  });

  describe('removeItem', () => {
    it('should remove item from cart', async () => {
      const result = await controller.removeItem(
        mockRequest as any,
        'prod_001',
      );
      expect(result.items.length).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(service.removeItem).toHaveBeenCalledWith('user_123', 'prod_001');
    });

    it('should call removeItem with correct productId', async () => {
      await controller.removeItem(mockRequest as any, 'prod_005');
      expect(service.removeItem).toHaveBeenCalledWith('user_123', 'prod_005');
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        CartController.prototype.removeItem,
      );
      expect(roles).toBeUndefined();
    });
  });

  describe('clearCart', () => {
    it('should clear entire cart', async () => {
      const result = await controller.clearCart(mockRequest as any);
      expect(result.items.length).toBe(0);
      expect(result.totalAmount).toBe(0);
      expect(service.clearCart).toHaveBeenCalledWith('user_123');
    });

    it('should use sub if userId not present in token', async () => {
      const reqWithSub = { user: { sub: 'user_123', roles: [Role.USER] } };
      await controller.clearCart(reqWithSub as any);
      expect(service.clearCart).toHaveBeenCalledWith('user_123');
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        CartController.prototype.clearCart,
      );
      expect(roles).toBeUndefined();
    });
  });

  describe('checkout', () => {
    it('should create order from cart with shipping address', async () => {
      const body = { shippingAddress: '123 Main St, City' };
      const result = await controller.checkout(mockRequest as any, body);

      expect(result).toEqual(mockOrder);
      expect(result.status).toBe(OrderStatus.PENDING);
      expect(service.checkout).toHaveBeenCalledWith(
        'user_123',
        '123 Main St, City',
      );
    });

    it('should create order without shipping address', async () => {
      const body = {};
      await controller.checkout(mockRequest as any, body);

      expect(service.checkout).toHaveBeenCalledWith('user_123', undefined);
    });

    it('should return order with correct totalAmount', async () => {
      const body = { shippingAddress: '123 Main St, City' };
      const result = await controller.checkout(mockRequest as any, body);

      expect(result.totalAmount).toBe(17.98);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it('should use sub if userId not present in token', async () => {
      const reqWithSub = { user: { sub: 'user_123', roles: [Role.USER] } };
      const body = { shippingAddress: '123 Main St' };
      await controller.checkout(reqWithSub as any, body);

      expect(service.checkout).toHaveBeenCalledWith('user_123', '123 Main St');
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        CartController.prototype.checkout,
      );
      expect(roles).toBeUndefined();
    });
  });
});
