import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockProduct = {
    _id: new Types.ObjectId(),
    name: 'Wireless Mouse',
    description: 'Ergonomic wireless mouse',
    price: 29.99,
    currency: 'USD',
    stock: 100,
    category: 'Electronics',
    active: true,
    tags: ['electronics', 'peripherals'],
    image: 'https://example.com/mouse.jpg',  // renamed from imageUrl
    rating: 4.5,                              // added
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProducts = [
    mockProduct,
    {
      ...mockProduct,
      _id: new Types.ObjectId(),
      name: 'Mechanical Keyboard',
      price: 89.99,
    },
  ];

  const productsRepositoryMock = {
    create: jest.fn(),
    findWithPagination: jest.fn(),
    findOne: jest.fn(),
    findByIds: jest.fn(),
    findOneAndUpdate: jest.fn(),
    findOneAndDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: productsRepositoryMock },
      ],
    }).compile();

    service = moduleRef.get(ProductsService);
  });

  describe('create', () => {
    it('should create a product with default values', async () => {
      const createDto: CreateProductDto = {
        name: 'Wireless Mouse',
        price: 29.99,
      };

      const expectedProduct = {
        ...createDto,
        stock: 0,
        currency: 'USD',
        active: true,
        tags: [],
      };

      productsRepositoryMock.create.mockResolvedValueOnce(mockProduct);

      const result = await service.create(createDto);

      expect(productsRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining(expectedProduct)
      );
      expect(result).toEqual(mockProduct);
    });

    it('should create a product with custom values', async () => {
      const createDto: CreateProductDto = {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse',
        price: 29.99,
        currency: 'EUR',
        stock: 50,
        category: 'Electronics',
        active: true,
        tags: ['electronics'],
        image: 'https://example.com/mouse.jpg',  // renamed from imageUrl
        rating: 4.5,                              // added
      };

      productsRepositoryMock.create.mockResolvedValueOnce(mockProduct);

      const result = await service.create(createDto);

      expect(productsRepositoryMock.create).toHaveBeenCalledWith(
        expect.objectContaining(createDto)
      );
      expect(result).toEqual(mockProduct);
    });
  });

  describe('findAll', () => {
    it('should return paginated products with default values', async () => {
      const query = {};

      productsRepositoryMock.findWithPagination.mockResolvedValueOnce({
        data: mockProducts,
        total: 2,
      });

      const result = await service.findAll(query as any);

      // default page=10, limit=50 → skip = (10-1)*50 = 450
      expect(productsRepositoryMock.findWithPagination).toHaveBeenCalledWith(
        {},
        { createdAt: -1 },
        450,
        50
      );
      expect(result).toEqual({
        data: mockProducts,
        total: 2,
        page: 10,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should filter food products by Dairy category', async () => {
      const query = { category: 'Dairy', page: 1, limit: 50 };

      productsRepositoryMock.findWithPagination.mockResolvedValueOnce({
        data: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query as any);

      expect(productsRepositoryMock.findWithPagination).toHaveBeenCalledWith(
        { category: 'Electronics' },
        { createdAt: -1 },
        0,
        50
      );
      expect(result.data).toHaveLength(1);
    });

    it('should search food products by keyword "organic"', async () => {
      const query = { search: 'organic', page: 1, limit: 50 };

      productsRepositoryMock.findWithPagination.mockResolvedValueOnce({
        data: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(query as any);

      expect(productsRepositoryMock.findWithPagination).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            expect.any(Object),
            expect.any(Object),
            expect.any(Object),
          ]),
        }),
        { createdAt: -1 },
        0,
        50
      );
      expect(result.data).toHaveLength(1);
    });

    it('should filter food products by active status', async () => {
      const query = { active: false, page: 1, limit: 50 };

      productsRepositoryMock.findWithPagination.mockResolvedValueOnce({
        data: [],
        total: 0,
      });

      const result = await service.findAll(query as any);

      expect(productsRepositoryMock.findWithPagination).toHaveBeenCalledWith(
        { active: false },
        { createdAt: -1 },
        0,
        50
      );
      expect(result.data).toHaveLength(0);
    });

    it('should calculate total pages correctly', async () => {
      const query = { page: 1, limit: 5 };

      productsRepositoryMock.findWithPagination.mockResolvedValueOnce({
        data: mockProducts,
        total: 12,
      });

      const result = await service.findAll(query as any);

      expect(result.totalPages).toBe(3);
    });
  });

  describe('findOne', () => {
    it('should find a product by valid ID', async () => {
      const productId = mockProduct._id.toString();

      productsRepositoryMock.findOne.mockResolvedValueOnce(mockProduct);

      const result = await service.findOne(productId);

      expect(productsRepositoryMock.findOne).toHaveBeenCalledWith({
        _id: expect.any(Object),
      });
      expect(result).toEqual(mockProduct);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const invalidId = 'invalid-id';

      await expect(service.findOne(invalidId)).rejects.toThrow(
        BadRequestException
      );
      expect(productsRepositoryMock.findOne).not.toHaveBeenCalled();
    });
  });

  describe('findByIds', () => {
    it('should return multiple products by valid IDs', async () => {
      const ids = [mockProduct._id.toString(), mockProducts[1]._id.toString()];

      productsRepositoryMock.findByIds.mockResolvedValueOnce(mockProducts);

      const result = await service.findByIds(ids);

      expect(productsRepositoryMock.findByIds).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Object),
          expect.any(Object),
        ])
      );
      expect(result).toEqual(mockProducts);
    });

    it('should return empty array when ids array is empty', async () => {
      const result = await service.findByIds([]);

      expect(productsRepositoryMock.findByIds).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should filter out invalid IDs and return only valid food products', async () => {
      const ids = [mockProduct._id.toString(), 'abc'];

      productsRepositoryMock.findByIds.mockResolvedValueOnce([mockProduct]);

      const result = await service.findByIds(ids);

      expect(productsRepositoryMock.findByIds).toHaveBeenCalledWith(
        expect.arrayContaining([expect.any(Object)])
      );
      expect(result).toHaveLength(1);
    });

    it('should return empty array when all IDs are invalid', async () => {
      const ids = ['abc', 'xyz'];

      const result = await service.findByIds(ids);

      expect(productsRepositoryMock.findByIds).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('should update a product with valid ID', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { price: 39.99 };
      const updatedProduct = { ...mockProduct, ...updateDto };

      productsRepositoryMock.findOneAndUpdate.mockResolvedValueOnce(
        updatedProduct
      );

      const result = await service.update(productId, updateDto);

      expect(productsRepositoryMock.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: expect.any(Object) },
        { $set: updateDto }
      );
      expect(result).toEqual(updatedProduct);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const invalidId = 'invalid-id';
      const updateDto: UpdateProductDto = { price: 39.99 };

      await expect(service.update(invalidId, updateDto)).rejects.toThrow(
        BadRequestException
      );
      expect(productsRepositoryMock.findOneAndUpdate).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { stock: 50 };

      productsRepositoryMock.findOneAndUpdate.mockResolvedValueOnce({
        ...mockProduct,
        stock: 50,
      });

      const result = await service.update(productId, updateDto);

      expect(result.stock).toBe(50);
    });
  });

  describe('remove', () => {
    it('should delete a product with valid ID', async () => {
      const productId = mockProduct._id.toString();

      productsRepositoryMock.findOneAndDelete.mockResolvedValueOnce(
        mockProduct
      );

      await service.remove(productId);

      expect(productsRepositoryMock.findOneAndDelete).toHaveBeenCalledWith({
        _id: expect.any(Object),
      });
    });

    it('should throw BadRequestException for invalid ID', async () => {
      const invalidId = 'invalid-id';

      await expect(service.remove(invalidId)).rejects.toThrow(
        BadRequestException
      );
      expect(productsRepositoryMock.findOneAndDelete).not.toHaveBeenCalled();
    });
  });
});