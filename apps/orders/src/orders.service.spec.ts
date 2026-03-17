import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { of } from 'rxjs';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let repository: OrdersRepository;
  let httpService: HttpService;

  const mockOrder = {
    _id: '507f1f77bcf86cd799439011',
    userId: 'user_123',
    items: [
      { productId: 'prod_001', quantity: 2, unitPrice: 8.99, subtotal: 17.98 },
    ],
    status: OrderStatus.PENDING,
    totalAmount: 17.98,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: {
            create: jest.fn().mockResolvedValue(mockOrder),
            find: jest.fn().mockResolvedValue([mockOrder]),
            findOne: jest.fn().mockResolvedValue(mockOrder),
            findByUserId: jest.fn().mockResolvedValue([mockOrder]),
            findOneAndUpdate: jest.fn().mockResolvedValue({
              ...mockOrder,
              status: OrderStatus.CONFIRMED,
            }),
            deleteById: jest.fn().mockResolvedValue(undefined),
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
              of({ data: { id: 'prod_001', price: 8.99 }, status: 200 }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    repository = module.get<OrdersRepository>(OrdersRepository);
    httpService = module.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call Products service and create order', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 2 }],
      };
      const userId = 'user_123';
      const result = await service.create(dto, userId);
      expect(result).toEqual(mockOrder);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://products:3002/products/prod_001',
        expect.any(Object),
      );
      expect(repository.create).toHaveBeenCalled();
    });

    it('should calculate total amount correctly', async () => {
      const dto: CreateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 2 }], // 2 × 8.99 = 17.98
      };
      const result = await service.create(dto, 'user_123');
      expect(result.totalAmount).toBe(17.98);
    });
  });

  describe('findAll', () => {
    it('should return all orders', async () => {
      expect(await service.findAll()).toEqual([mockOrder]);
      expect(repository.find).toHaveBeenCalledWith({});
    });
  });

  describe('findOne', () => {
    it('should return one order', async () => {
      expect(await service.findOne(mockOrder._id)).toEqual(mockOrder);
      expect(repository.findOne).toHaveBeenCalled();
    });
  });

  describe('findByUserId', () => {
    it('should return orders for user', async () => {
      expect(await service.findByUserId('user_123')).toEqual([mockOrder]);
      expect(repository.findByUserId).toHaveBeenCalledWith('user_123');
    });
  });

  describe('updateStatus', () => {
    it('should update order status', async () => {
      const dto: UpdateOrderStatusDto = { status: OrderStatus.CONFIRMED };
      const result = await service.updateStatus(mockOrder._id, dto);
      expect(result.status).toBe(OrderStatus.CONFIRMED);
      expect(repository.findOneAndUpdate).toHaveBeenCalled();
    });
  });

  // ← NEW: update tests
  describe('update', () => {
    it('should update item quantity successfully', async () => {
      const updatedOrder = {
        ...mockOrder,
        items: [
          { productId: 'prod_001', quantity: 5, unitPrice: 8.99, subtotal: 44.95 },
        ],
        totalAmount: 44.95,
      };
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(updatedOrder as any);

      const dto: UpdateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 5 }],
      };
      const result = await service.update(mockOrder._id, dto);
      expect(result.totalAmount).toBe(44.95);
      expect(repository.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should add new item to order', async () => {
      const updatedOrder = {
        ...mockOrder,
        items: [
          { productId: 'prod_001', quantity: 2, unitPrice: 8.99, subtotal: 17.98 },
          { productId: 'prod_003', quantity: 1, unitPrice: 8.99, subtotal: 8.99 },
        ],
        totalAmount: 26.97,
      };
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(updatedOrder as any);

      const dto: UpdateOrderDto = {
        items: [{ productId: 'prod_003', quantity: 1 }], // ← new item
      };
      const result = await service.update(mockOrder._id, dto);
      expect(result.items.length).toBe(2);
      expect(repository.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should remove item when quantity is 0', async () => {
      const updatedOrder = {
        ...mockOrder,
        items: [], // ← item removed
        totalAmount: 0,
      };
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(updatedOrder as any);

      const dto: UpdateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 0 }], // ← quantity 0 = remove
      };
      const result = await service.update(mockOrder._id, dto);
      expect(result.items.length).toBe(0);
      expect(repository.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should update shipping address', async () => {
      const updatedOrder = {
        ...mockOrder,
        shippingAddress: '456 New St, City',
      };
      jest.spyOn(repository, 'findOneAndUpdate').mockResolvedValue(updatedOrder as any);

      const dto: UpdateOrderDto = {
        shippingAddress: '456 New St, City',
      };
      const result = await service.update(mockOrder._id, dto);
      expect(result.shippingAddress).toBe('456 New St, City');
      expect(repository.findOneAndUpdate).toHaveBeenCalled();
    });

    it('should throw BadRequestException for non-PENDING order', async () => {
      // ← Mock a CONFIRMED order
      jest.spyOn(repository, 'findOne').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.CONFIRMED,
      } as any);

      const dto: UpdateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 5 }],
      };

      await expect(service.update(mockOrder._id, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update(mockOrder._id, dto)).rejects.toThrow(
        'Cannot update order with status: CONFIRMED',
      );
    });

    it('should throw BadRequestException for SHIPPED order', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.SHIPPED,
      } as any);

      const dto: UpdateOrderDto = {
        items: [{ productId: 'prod_001', quantity: 5 }],
      };

      await expect(service.update(mockOrder._id, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should delete an order successfully', async () => {
      await service.remove(mockOrder._id);
      expect(repository.deleteById).toHaveBeenCalledWith(mockOrder._id);
    });

    it('should throw NotFoundException when order not found', async () => {
      jest.spyOn(repository, 'deleteById').mockRejectedValue(
        new NotFoundException('Document was not found'),
      );
      await expect(service.remove('nonexistent_id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should call deleteById with correct id', async () => {
      const orderId = '507f1f77bcf86cd799439011';
      await service.remove(orderId);
      expect(repository.deleteById).toHaveBeenCalledWith(orderId);
      expect(repository.deleteById).toHaveBeenCalledTimes(1);
    });
  });
});