import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '@app/common';
import { RolesGuard } from '@app/common/auth/roles.guard';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  const mockOrder = {
    _id: '507f1f77bcf86cd799439011',
    userId: 'user_123',
    items: [
      { productId: 'prod_001', quantity: 2, unitPrice: 8.99, subtotal: 17.98 },
    ],
    status: OrderStatus.PENDING,
    totalAmount: 17.98,
  };

  // ← Regular user mock request
  const mockUserRequest = {
    user: {
      userId: 'user_123',
      sub: 'user_123',
      roles: ['user'],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockOrder),
            findAll: jest.fn().mockResolvedValue([mockOrder]),
            findOne: jest.fn().mockResolvedValue(mockOrder),
            findByUserId: jest.fn().mockResolvedValue([mockOrder]),
            update: jest.fn().mockResolvedValue({
              ...mockOrder,
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
            updateStatus: jest.fn().mockResolvedValue({
              ...mockOrder,
              status: OrderStatus.CONFIRMED,
            }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard) // ← override RolesGuard for most tests
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an order for logged in user', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 2 }],
      };
      const result = await controller.create(mockUserRequest as any, dto);
      expect(result).toEqual(mockOrder);
      expect(service.create).toHaveBeenCalledWith(dto, 'user_123');
    });

    it('should extract userId from token', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 2 }],
      };
      await controller.create(mockUserRequest as any, dto);
      expect(service.create).toHaveBeenCalledWith(dto, 'user_123');
    });
  });

  describe('findAll (Admin only)', () => {
    it('should return all orders for admin', async () => {
      expect(await controller.findAll()).toEqual([mockOrder]);
      expect(service.findAll).toHaveBeenCalled();
    });

    it('should be restricted to admin role', () => {
      // ← Verify @Roles(Role.ADMIN) decorator is applied
      const roles = Reflect.getMetadata(
        'roles',
        OrdersController.prototype.findAll,
      );
      expect(roles).toContain('admin');
    });
  });

  describe('getMyOrders', () => {
    it('should return orders for logged in user from JWT token', async () => {
      const result = await controller.getMyOrders(mockUserRequest as any);
      expect(result).toEqual([mockOrder]);
      expect(service.findByUserId).toHaveBeenCalledWith('user_123');
    });

    it('should use sub if userId not present in token', async () => {
      const reqWithSub = { user: { sub: 'user_123', roles: ['user'] } };
      const result = await controller.getMyOrders(reqWithSub as any);
      expect(result).toEqual([mockOrder]);
      expect(service.findByUserId).toHaveBeenCalledWith('user_123');
    });

    it('should not require admin role', () => {
      // ← Verify no @Roles decorator on getMyOrders
      const roles = Reflect.getMetadata(
        'roles',
        OrdersController.prototype.getMyOrders,
      );
      expect(roles).toBeUndefined(); // ← accessible to all logged in users
    });
  });

  describe('findByUserId (Admin only)', () => {
    it('should return orders for specific user', async () => {
      expect(await controller.findByUserId('user_123')).toEqual([mockOrder]);
      expect(service.findByUserId).toHaveBeenCalledWith('user_123');
    });

    it('should be restricted to admin role', () => {
      // ← Verify @Roles(Role.ADMIN) decorator is applied
      const roles = Reflect.getMetadata(
        'roles',
        OrdersController.prototype.findByUserId,
      );
      expect(roles).toContain('admin');
    });
  });

  describe('findOne', () => {
    it('should return a single order', async () => {
      expect(await controller.findOne(mockOrder._id)).toEqual(mockOrder);
      expect(service.findOne).toHaveBeenCalledWith(mockOrder._id);
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        OrdersController.prototype.findOne,
      );
      expect(roles).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update order items', async () => {
      const dto: UpdateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 5 }],
      };
      const result = await controller.update(mockOrder._id, dto);
      expect(result).toEqual({
        ...mockOrder,
        items: [
          {
            productId: 'prod_001',
            quantity: 5,
            unitPrice: 8.99,
            subtotal: 44.95,
          },
        ],
        totalAmount: 44.95,
      });
      expect(service.update).toHaveBeenCalledWith(mockOrder._id, dto);
    });

    it('should update shipping address', async () => {
      const dto: UpdateOrderDto = {
        shippingAddress: '456 New St, City',
      };
      await controller.update(mockOrder._id, dto);
      expect(service.update).toHaveBeenCalledWith(mockOrder._id, dto);
    });

    it('should update both items and shipping address', async () => {
      const dto: UpdateOrderDto = {
        items: [
          { productId: 'prod_001', quantity: 5 },
          { productId: 'prod_003', quantity: 2 },
          { productId: 'prod_005', quantity: 0 },
        ],
        shippingAddress: '456 New St, City',
      };
      await controller.update(mockOrder._id, dto);
      expect(service.update).toHaveBeenCalledWith(mockOrder._id, dto);
    });

    it('should call update with correct order id', async () => {
      const dto: UpdateOrderDto = { items: [] };
      await controller.update(mockOrder._id, dto);
      expect(service.update).toHaveBeenCalledWith(mockOrder._id, dto);
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        OrdersController.prototype.update,
      );
      expect(roles).toBeUndefined();
    });
  });

  describe('updateStatus (Admin only)', () => {
    it('should update order status', async () => {
      const dto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };
      const result = await controller.updateStatus(mockOrder._id, dto);
      expect(result).toEqual({ ...mockOrder, status: OrderStatus.CONFIRMED });
      expect(service.updateStatus).toHaveBeenCalledWith(mockOrder._id, dto);
    });

    it('should be restricted to admin role', () => {
      // ← Verify @Roles(Role.ADMIN) decorator is applied
      const roles = Reflect.getMetadata(
        'roles',
        OrdersController.prototype.updateStatus,
      );
      expect(roles).toContain('admin');
    });
  });

  describe('remove', () => {
    it('should delete an order', async () => {
      const result = await controller.remove(mockOrder._id);
      expect(result).toBeUndefined();
      expect(service.remove).toHaveBeenCalledWith(mockOrder._id);
    });

    it('should call remove with correct order id', async () => {
      const orderId = '507f1f77bcf86cd799439011';
      await controller.remove(orderId);
      expect(service.remove).toHaveBeenCalledWith(orderId);
    });

    it('should not require admin role', () => {
      const roles = Reflect.getMetadata(
        'roles',
        OrdersController.prototype.remove,
      );
      expect(roles).toBeUndefined();
    });
  });
});
