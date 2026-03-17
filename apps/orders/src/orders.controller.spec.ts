import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

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

  // ← mock request object with JWT user
  const mockRequest = {
    user: {
      userId: 'user_123',
      sub: 'user_123',
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
            updateStatus: jest.fn().mockResolvedValue({
              ...mockOrder,
              status: OrderStatus.CONFIRMED,
            }),
          },
        },
      ],
    })
      .overrideGuard(require('./guards/jwt-auth.guard').JwtAuthGuard) // ← bypass JWT guard in tests
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an order', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 2 }], // ← no userId in DTO
      };
      const result = await controller.create(mockRequest as any, dto); // ← pass mockRequest
      expect(result).toEqual(mockOrder);
      expect(service.create).toHaveBeenCalledWith(dto, 'user_123'); // ← userId passed separately
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', async () => {
      expect(await controller.findAll()).toEqual([mockOrder]);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a single order', async () => {
      expect(await controller.findOne(mockOrder._id)).toEqual(mockOrder);
      expect(service.findOne).toHaveBeenCalledWith(mockOrder._id);
    });
  });

  describe('findByUserId', () => {
    it('should return orders for a user', async () => {
      expect(await controller.findByUserId('user_123')).toEqual([mockOrder]);
      expect(service.findByUserId).toHaveBeenCalledWith('user_123');
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const dto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };
      const result = await controller.updateStatus(mockOrder._id, dto);
      expect(result).toEqual({ ...mockOrder, status: OrderStatus.CONFIRMED });
      expect(service.updateStatus).toHaveBeenCalledWith(mockOrder._id, dto);
    });
  });
});