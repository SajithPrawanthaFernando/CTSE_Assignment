import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { OrdersService } from './orders.service';
import { OrdersRepository } from './orders.repository';
import { OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
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
        items: [{ productId: 'prod_001', quantity: 2 }], // ← removed userId
      };
      const userId = 'user_123'; // ← userId now separate
      const result = await service.create(dto, userId); // ← pass userId separately
      expect(result).toEqual(mockOrder);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://products:3002/products/prod_001',
        expect.any(Object),
      );
      expect(repository.create).toHaveBeenCalled();
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
});