import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OrderDocument, OrderStatus } from './schemas/order.schema';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

export interface ProductInfo {
  id: string;
  name?: string;
  price: number;
  inStock?: boolean;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  private async getProductInfo(productId: string): Promise<ProductInfo> {
    const baseUrl = this.configService.get<string>('PRODUCTS_HTTP_BASEURL');
    if (!baseUrl) {
      throw new BadRequestException(
        'Products service URL not configured; cannot validate products.',
      );
    }
    try {
      const response = await firstValueFrom(
        this.httpService.get<ProductInfo>(`${baseUrl}/products/${productId}`, {
          timeout: 5000,
          validateStatus: (status) => status === 200,
        }),
      );
      return response.data;
    } catch {
      throw new BadRequestException(
        `Product not found or unavailable: ${productId}`,
      );
    }
  }

  async create(createOrderDto: CreateOrderDto, userId: string): Promise<OrderDocument> {
    const itemsWithPrice: OrderDocument['items'] = [];
    let totalAmount = 0;

    for (const item of createOrderDto.items) {
      const product = await this.getProductInfo(item.productId);
      const subtotal = product.price * item.quantity;
      totalAmount += subtotal;
      itemsWithPrice.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal,
      });
    }

    return this.ordersRepository.create({
      userId,
      items: itemsWithPrice,
      status: OrderStatus.PENDING,
      totalAmount,
      shippingAddress: createOrderDto.shippingAddress,
    } as Omit<OrderDocument, '_id'>);
  }

  async findAll(): Promise<OrderDocument[]> {
    return this.ordersRepository.find({});
  }

  async findOne(id: string): Promise<OrderDocument> {
    return this.ordersRepository.findOne({ _id: id } as any);
  }

  async findByUserId(userId: string): Promise<OrderDocument[]> {
    return this.ordersRepository.findByUserId(userId);
  }

  async updateStatus(
    id: string,
    dto: UpdateOrderStatusDto,
  ): Promise<OrderDocument> {
    return this.ordersRepository.findOneAndUpdate(
      { _id: id } as any,
      { $set: { status: dto.status } } as any,
    );
  }

  // ← NEW: Update order items and/or shipping address
  async update(id: string, updateOrderDto: UpdateOrderDto): Promise<OrderDocument> {
    // Step 1 — Get existing order
    const existingOrder = await this.ordersRepository.findOne({ _id: id } as any);

    // Step 2 — Only allow updates on PENDING orders
    if (existingOrder.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update order with status: ${existingOrder.status}. Only PENDING orders can be updated.`,
      );
    }

    // Step 3 — Process item updates if provided
    let itemsWithPrice = [...existingOrder.items];
    let totalAmount = existingOrder.totalAmount;

    if (updateOrderDto.items && updateOrderDto.items.length > 0) {
      for (const updatedItem of updateOrderDto.items) {
        const existingItemIndex = itemsWithPrice.findIndex(
          (i) => i.productId === updatedItem.productId,
        );

        if (updatedItem.quantity === 0) {
          // ← Remove item if quantity is 0
          if (existingItemIndex !== -1) {
            itemsWithPrice.splice(existingItemIndex, 1);
          }
        } else if (existingItemIndex !== -1) {
          // ← Update quantity of existing item
          const product = await this.getProductInfo(updatedItem.productId);
          itemsWithPrice[existingItemIndex] = {
            productId: updatedItem.productId,
            quantity: updatedItem.quantity,
            unitPrice: product.price,
            subtotal: product.price * updatedItem.quantity,
          };
        } else {
          // ← Add new item
          const product = await this.getProductInfo(updatedItem.productId);
          itemsWithPrice.push({
            productId: updatedItem.productId,
            quantity: updatedItem.quantity,
            unitPrice: product.price,
            subtotal: product.price * updatedItem.quantity,
          });
        }
      }

      // Recalculate total amount
      totalAmount = itemsWithPrice.reduce((sum, item) => sum + item.subtotal, 0);
    }

    // Step 4 — Save updated order
    return this.ordersRepository.findOneAndUpdate(
      { _id: id } as any,
      {
        $set: {
          items: itemsWithPrice,
          totalAmount,
          ...(updateOrderDto.shippingAddress && {
            shippingAddress: updateOrderDto.shippingAddress,
          }),
        },
      } as any,
    );
  }

  // ← Delete order
  async remove(id: string): Promise<void> {
    await this.ordersRepository.deleteById(id);
  }
}