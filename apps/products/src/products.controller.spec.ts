import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsController', () => {
  let controller: ProductsController;

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
    imageUrl: 'https://example.com/mouse.jpg',
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

  const productsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByIds: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: productsServiceMock }],
    }).compile();

    controller = moduleRef.get(ProductsController);
  });

  describe('create', () => {
    it('should create a new product', async () => {
      const createDto: CreateProductDto = {
        name: 'Wireless Mouse',
        price: 29.99,
      };

      productsServiceMock.create.mockResolvedValueOnce(mockProduct);

      const result = await controller.create(createDto);

      expect(productsServiceMock.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockProduct);
    });

    it('should create a product with all fields', async () => {
      const createDto: CreateProductDto = {
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with USB receiver',
        price: 29.99,
        currency: 'USD',
        stock: 100,
        category: 'Electronics',
        active: true,
        tags: ['electronics', 'peripherals'],
        imageUrl: 'https://example.com/mouse.jpg',
      };

      productsServiceMock.create.mockResolvedValueOnce(mockProduct);

      const result = await controller.create(createDto);

      expect(productsServiceMock.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockProduct);
    });

    it('should handle create errors gracefully', async () => {
      const createDto: CreateProductDto = {
        name: 'Wireless Mouse',
        price: 29.99,
      };

      const error = new Error('Database error');
      productsServiceMock.create.mockRejectedValueOnce(error);

      await expect(controller.create(createDto)).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('findAll', () => {
    it('should return all products with default pagination', async () => {
      const query = {};
      const paginatedResult = {
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      productsServiceMock.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query as any);

      expect(productsServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(2);
    });

    it('should return products with custom pagination', async () => {
      const query = { page: 2, limit: 5 };
      const paginatedResult = {
        data: [mockProducts[0]],
        total: 10,
        page: 2,
        limit: 5,
        totalPages: 2,
      };

      productsServiceMock.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query as any);

      expect(productsServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
    });

    it('should filter products by category', async () => {
      const query = { category: 'Electronics', page: 1, limit: 10 };
      const paginatedResult = {
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      productsServiceMock.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query as any);

      expect(productsServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
    });

    it('should search products by keyword', async () => {
      const query = { search: 'mouse', page: 1, limit: 10 };
      const paginatedResult = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      productsServiceMock.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query as any);

      expect(productsServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByIds (bulk)', () => {
    it('should return multiple products by IDs', async () => {
      const ids = [mockProduct._id.toString(), mockProducts[1]._id.toString()];

      productsServiceMock.findByIds.mockResolvedValueOnce(mockProducts);

      const result = await controller.findByIds(ids);

      expect(productsServiceMock.findByIds).toHaveBeenCalledWith(ids);
      expect(result).toEqual(mockProducts);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no IDs provided', async () => {
      const ids = [];

      productsServiceMock.findByIds.mockResolvedValueOnce([]);

      const result = await controller.findByIds(ids);

      expect(productsServiceMock.findByIds).toHaveBeenCalledWith(ids);
      expect(result).toEqual([]);
    });

    it('should handle bulk request with some invalid IDs', async () => {
      const ids = [mockProduct._id.toString()];

      productsServiceMock.findByIds.mockResolvedValueOnce([mockProduct]);

      const result = await controller.findByIds(ids);

      expect(productsServiceMock.findByIds).toHaveBeenCalledWith(ids);
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a product by ID', async () => {
      const productId = mockProduct._id.toString();

      productsServiceMock.findOne.mockResolvedValueOnce(mockProduct);

      const result = await controller.findOne(productId);

      expect(productsServiceMock.findOne).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProduct);
    });

    it('should handle product not found error', async () => {
      const productId = new Types.ObjectId().toString();

      productsServiceMock.findOne.mockRejectedValueOnce(
        new Error('Product not found')
      );

      await expect(controller.findOne(productId)).rejects.toThrow(
        'Product not found'
      );
    });

    it('should handle invalid product ID', async () => {
      const invalidId = 'invalid-id';

      productsServiceMock.findOne.mockRejectedValueOnce(
        new Error('Invalid product ID')
      );

      await expect(controller.findOne(invalidId)).rejects.toThrow(
        'Invalid product ID'
      );
    });
  });

  describe('update', () => {
    it('should update a product', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { price: 39.99 };
      const updatedProduct = { ...mockProduct, ...updateDto };

      productsServiceMock.update.mockResolvedValueOnce(updatedProduct);

      const result = await controller.update(productId, updateDto);

      expect(productsServiceMock.update).toHaveBeenCalledWith(
        productId,
        updateDto
      );
      expect(result.price).toBe(39.99);
    });

    it('should update product stock', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { stock: 50 };
      const updatedProduct = { ...mockProduct, stock: 50 };

      productsServiceMock.update.mockResolvedValueOnce(updatedProduct);

      const result = await controller.update(productId, updateDto);

      expect(productsServiceMock.update).toHaveBeenCalledWith(
        productId,
        updateDto
      );
      expect(result.stock).toBe(50);
    });

    it('should handle partial product updates', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = {
        description: 'Updated description',
        tags: ['new-tag'],
      };
      const updatedProduct = { ...mockProduct, ...updateDto };

      productsServiceMock.update.mockResolvedValueOnce(updatedProduct);

      const result = await controller.update(productId, updateDto);

      expect(productsServiceMock.update).toHaveBeenCalledWith(
        productId,
        updateDto
      );
      expect(result.description).toBe('Updated description');
    });

    it('should handle update errors', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { price: 39.99 };

      productsServiceMock.update.mockRejectedValueOnce(
        new Error('Product not found')
      );

      await expect(controller.update(productId, updateDto)).rejects.toThrow(
        'Product not found'
      );
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      const productId = mockProduct._id.toString();

      productsServiceMock.remove.mockResolvedValueOnce(undefined);

      await controller.remove(productId);

      expect(productsServiceMock.remove).toHaveBeenCalledWith(productId);
    });

    it('should handle delete errors', async () => {
      const productId = mockProduct._id.toString();

      productsServiceMock.remove.mockRejectedValueOnce(
        new Error('Product not found')
      );

      await expect(controller.remove(productId)).rejects.toThrow(
        'Product not found'
      );
    });

    it('should handle deletion of non-existent product', async () => {
      const productId = new Types.ObjectId().toString();

      productsServiceMock.remove.mockRejectedValueOnce(
        new Error('Product not found')
      );

      await expect(controller.remove(productId)).rejects.toThrow(
        'Product not found'
      );
    });
  });
});
