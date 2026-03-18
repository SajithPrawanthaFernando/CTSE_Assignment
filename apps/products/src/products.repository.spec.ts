import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ProductsRepository } from './products.repository';
import { ProductDocument } from './schemas/product.schema';

describe('ProductsRepository', () => {
  let repository: ProductsRepository;

  const mockProduct = {
    _id: new Types.ObjectId(),
    name: 'Organic Sourdough Bread',
    description: 'Freshly baked artisan sourdough with a crispy crust',
    price: 8.99,
    category: 'Bakery',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    rating: 4.5,
    active: true,
    tags: ['bread', 'organic'],
    stock: 50,
    currency: 'USD',
  };

  const mockProducts = [
    mockProduct,
    {
      ...mockProduct,
      _id: new Types.ObjectId(),
      name: 'Aged Cheddar Cheese',
      price: 14.99,
      category: 'Dairy',
    },
  ];

  const mockQuery = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  const mockModel = {
    find: jest.fn().mockReturnValue(mockQuery),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    constructor: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsRepository,
        {
          provide: getModelToken(ProductDocument.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    repository = moduleRef.get(ProductsRepository);
  });

  describe('findWithPagination', () => {
    it('should return paginated food products', async () => {
      mockQuery.exec.mockResolvedValueOnce(mockProducts);
      mockModel.countDocuments.mockResolvedValueOnce(2);

      const result = await repository.findWithPagination(
        {},
        { createdAt: -1 },
        0,
        50,
      );

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockQuery.skip).toHaveBeenCalledWith(0);
      expect(mockQuery.limit).toHaveBeenCalledWith(50);
      expect(mockQuery.lean).toHaveBeenCalled();
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter food products by category', async () => {
      mockQuery.exec.mockResolvedValueOnce([mockProduct]);
      mockModel.countDocuments.mockResolvedValueOnce(1);

      const result = await repository.findWithPagination(
        { category: 'Bakery' },
        { createdAt: -1 },
        0,
        50,
      );

      expect(mockModel.find).toHaveBeenCalledWith({ category: 'Bakery' });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should return empty array when no food products found', async () => {
      mockQuery.exec.mockResolvedValueOnce([]);
      mockModel.countDocuments.mockResolvedValueOnce(0);

      const result = await repository.findWithPagination(
        { category: 'NonExistent' },
        { createdAt: -1 },
        0,
        50,
      );

      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should apply skip and limit for pagination', async () => {
      mockQuery.exec.mockResolvedValueOnce([mockProduct]);
      mockModel.countDocuments.mockResolvedValueOnce(10);

      await repository.findWithPagination(
        {},
        { createdAt: -1 },
        50,
        10,
      );

      expect(mockQuery.skip).toHaveBeenCalledWith(50);
      expect(mockQuery.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('findByIds', () => {
    it('should return food products by valid ObjectIds', async () => {
      const ids = mockProducts.map((p) => p._id);
      mockQuery.exec.mockResolvedValueOnce(mockProducts);

      const result = await repository.findByIds(ids as Types.ObjectId[]);

      expect(mockModel.find).toHaveBeenCalledWith({
        _id: { $in: ids },
      });
      expect(result).toHaveLength(2);
    });

    it('should return empty array when ids array is empty', async () => {
      const result = await repository.findByIds([]);

      expect(mockModel.find).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return single food product by ID', async () => {
      const ids = [mockProduct._id as Types.ObjectId];
      mockQuery.exec.mockResolvedValueOnce([mockProduct]);

      const result = await repository.findByIds(ids);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Organic Sourdough Bread');
    });
  });
});