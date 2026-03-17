import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OrderDocument, OrderStatus } from './schemas/order.schema';
import { OrdersRepository } from './orders.repository';
import { CreateOrderDto } from './dto/create-order.dto';
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

  // ← NEW: Delete order (uses deleteById from repository)
  async remove(id: string): Promise<void> {
    await this.ordersRepository.deleteById(id);
    // AbstractRepository's findOneAndDelete already throws
    // NotFoundException automatically if order not found
  }
}