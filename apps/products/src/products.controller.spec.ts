import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { AUTH_SERVICE } from '@app/common'; // Import your constant
import { Reflector } from '@nestjs/core';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockProduct = {
    _id: new Types.ObjectId(),
    name: 'Classic Cheeseburger',
    description: 'Juicy beef patty with cheddar cheese, lettuce and tomato',
    price: 9.99,
    currency: 'USD',
    stock: 100,
    category: 'Burgers',
    active: true,
    tags: ['burger', 'beef', 'classic'],
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
    rating: 4.5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProducts = [
    mockProduct,
    {
      ...mockProduct,
      _id: new Types.ObjectId(),
      name: 'Margherita Pizza',
      description: 'Fresh mozzarella, tomato sauce and basil on thin crust',
      price: 11.99,
      category: 'Pizza',
      tags: ['pizza', 'vegetarian', 'italian'],
      image:
        'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
      rating: 4.6,
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
      providers: [
        { provide: ProductsService, useValue: productsServiceMock },
        // Fix: Mock the AUTH_SERVICE TCP Client
        {
          provide: AUTH_SERVICE,
          useValue: {
            send: jest.fn(),
            emit: jest.fn(),
          },
        },
        // Fix: Provide Reflector (needed for RolesGuards/JwtGuards)
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get<ProductsController>(ProductsController);
  });

  describe('create', () => {
    it('should create a new food product', async () => {
      const createDto: CreateProductDto = {
        name: 'Classic Cheeseburger',
        price: 9.99,
      };

      productsServiceMock.create.mockResolvedValueOnce(mockProduct);

      const result = await controller.create(createDto);

      expect(productsServiceMock.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockProduct);
    });

    it('should create a food product with all fields', async () => {
      const createDto: CreateProductDto = {
        name: 'Spicy Jalapeno Burger',
        description: 'Pepper jack cheese, jalapenos and chipotle mayo',
        price: 13.49,
        currency: 'USD',
        stock: 80,
        category: 'Burgers',
        active: true,
        tags: ['burger', 'spicy', 'jalapeno'],
        image:
          'https://images.unsplash.com/photo-1551782450-17144efb9c50?w=400',
        rating: 4.4,
      };

      productsServiceMock.create.mockResolvedValueOnce(mockProduct);

      const result = await controller.create(createDto);

      expect(productsServiceMock.create).toHaveBeenCalledWith(createDto);
      expect(result).toEqual(mockProduct);
    });

    it('should handle create errors gracefully', async () => {
      const createDto: CreateProductDto = {
        name: 'Classic Cheeseburger',
        price: 9.99,
      };

      const error = new Error('Database error');
      productsServiceMock.create.mockRejectedValueOnce(error);

      await expect(controller.create(createDto)).rejects.toThrow(
        'Database error',
      );
    });
  });

  describe('findAll', () => {
    it('should return all food products with default pagination', async () => {
      const query = {};
      const paginatedResult = {
        data: mockProducts,
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      productsServiceMock.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query as any);

      expect(productsServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
      expect(result.data).toHaveLength(2);
    });

    it('should return food products with custom pagination', async () => {
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

    it('should filter food products by Burgers category', async () => {
      const query = { category: 'Burgers', page: 1, limit: 50 };
      const paginatedResult = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      productsServiceMock.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query as any);

      expect(productsServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result).toEqual(paginatedResult);
    });

    it('should search food products by keyword "burger"', async () => {
      const query = { search: 'burger', page: 1, limit: 50 };
      const paginatedResult = {
        data: [mockProduct],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      };

      productsServiceMock.findAll.mockResolvedValueOnce(paginatedResult);

      const result = await controller.findAll(query as any);

      expect(productsServiceMock.findAll).toHaveBeenCalledWith(query);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findByIds (bulk)', () => {
    it('should return multiple food products by IDs', async () => {
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
    it('should return a food product by ID', async () => {
      const productId = mockProduct._id.toString();

      productsServiceMock.findOne.mockResolvedValueOnce(mockProduct);

      const result = await controller.findOne(productId);

      expect(productsServiceMock.findOne).toHaveBeenCalledWith(productId);
      expect(result).toEqual(mockProduct);
      expect(result.category).toBe('Burgers');
    });

    it('should handle food product not found error', async () => {
      const productId = new Types.ObjectId().toString();

      productsServiceMock.findOne.mockRejectedValueOnce(
        new Error('Product not found'),
      );

      await expect(controller.findOne(productId)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should handle invalid food product ID', async () => {
      const invalidId = 'invalid-id';

      productsServiceMock.findOne.mockRejectedValueOnce(
        new Error('Invalid product ID'),
      );

      await expect(controller.findOne(invalidId)).rejects.toThrow(
        'Invalid product ID',
      );
    });
  });

  describe('update', () => {
    it('should update a food product price', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { price: 10.99 };
      const updatedProduct = { ...mockProduct, price: 10.99 };

      productsServiceMock.update.mockResolvedValueOnce(updatedProduct);

      const result = await controller.update(productId, updateDto);

      expect(productsServiceMock.update).toHaveBeenCalledWith(
        productId,
        updateDto,
      );
      expect(result.price).toBe(10.99);
    });

    it('should update food product stock after restocking', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { stock: 200 };
      const updatedProduct = { ...mockProduct, stock: 200 };

      productsServiceMock.update.mockResolvedValueOnce(updatedProduct);

      const result = await controller.update(productId, updateDto);

      expect(productsServiceMock.update).toHaveBeenCalledWith(
        productId,
        updateDto,
      );
      expect(result.stock).toBe(200);
    });

    it('should handle partial food product updates', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = {
        description: 'Now with extra cheese and fresh daily baked bun',
        tags: ['burger', 'beef', 'classic', 'daily-fresh'],
      };
      const updatedProduct = { ...mockProduct, ...updateDto };

      productsServiceMock.update.mockResolvedValueOnce(updatedProduct);

      const result = await controller.update(productId, updateDto);

      expect(productsServiceMock.update).toHaveBeenCalledWith(
        productId,
        updateDto,
      );
      expect(result.description).toBe(
        'Now with extra cheese and fresh daily baked bun',
      );
    });

    it('should handle update errors for discontinued food product', async () => {
      const productId = mockProduct._id.toString();
      const updateDto: UpdateProductDto = { price: 10.99 };

      productsServiceMock.update.mockRejectedValueOnce(
        new Error('Product not found'),
      );

      await expect(controller.update(productId, updateDto)).rejects.toThrow(
        'Product not found',
      );
    });
  });

  describe('remove', () => {
    it('should delete a discontinued food product', async () => {
      const productId = mockProduct._id.toString();

      productsServiceMock.remove.mockResolvedValueOnce(undefined);

      await controller.remove(productId);

      expect(productsServiceMock.remove).toHaveBeenCalledWith(productId);
    });

    it('should handle delete errors', async () => {
      const productId = mockProduct._id.toString();

      productsServiceMock.remove.mockRejectedValueOnce(
        new Error('Product not found'),
      );

      await expect(controller.remove(productId)).rejects.toThrow(
        'Product not found',
      );
    });

    it('should handle deletion of non-existent food product', async () => {
      const productId = new Types.ObjectId().toString();

      productsServiceMock.remove.mockRejectedValueOnce(
        new Error('Product not found'),
      );

      await expect(controller.remove(productId)).rejects.toThrow(
        'Product not found',
      );
    });
  });
});
