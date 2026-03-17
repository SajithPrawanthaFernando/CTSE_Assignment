import { Injectable, NotFoundException } from '@nestjs/common';

export interface Product {
  id: string;
  name: string;
  price: number;
  inStock: boolean;
}

/**
 * In-memory product catalog for integration demo.
 * Orders service calls GET /products/:id to validate and get price.
 */
const MOCK_PRODUCTS: Product[] = [
  { id: 'prod_001', name: 'Cheese Burger', price: 8.99, inStock: true },
  { id: 'prod_002', name: 'Chicken Wrap', price: 7.49, inStock: true },
  { id: 'prod_003', name: 'Fish & Chips', price: 12.99, inStock: true },
  { id: 'prod_004', name: 'Caesar Salad', price: 6.99, inStock: true },
  { id: 'prod_005', name: 'Soft Drink', price: 2.49, inStock: true },
];

@Injectable()
export class ProductsService {
  findAll(): Product[] {
    return MOCK_PRODUCTS;
  }

  findOne(id: string): Product {
    const product = MOCK_PRODUCTS.find((p) => p.id === id);
    if (!product) {
      throw new NotFoundException(`Product not found: ${id}`);
    }
    return product;
  }
}
