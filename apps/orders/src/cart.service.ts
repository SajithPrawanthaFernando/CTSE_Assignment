import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CartDocument } from './schemas/cart.schema';
import { CartRepository } from './cart.repository';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { OrdersService } from './orders.service';
import { OrderDocument } from './schemas/order.schema';

export interface ProductInfo {
  id: string;
  name?: string;
  price: number;
  inStock?: boolean;
}

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly ordersService: OrdersService,
  ) {}

  private async getProductInfo(productId: string): Promise<ProductInfo> {
    const baseUrl = this.configService.get<string>('PRODUCTS_HTTP_BASEURL');
    console.log(
      `[CartService] Fetching product info for ${productId} from ${baseUrl}`,
    );
    if (!baseUrl) {
      throw new BadRequestException('Products service URL not configured.');
    }
    try {
      console.log(`[CartService] Sending request to products service...`);
      const response = await firstValueFrom(
        this.httpService.get<ProductInfo>(`${baseUrl}/products/${productId}`, {
          timeout: 5000,
          validateStatus: (status) => status === 200,
        }),
      );

      console.log(`[CartService] Product info received:`, response.data);
      return response.data;
    } catch (error) {
      // LOG THE ACTUAL ERROR
      console.error(`[CartService] Request Failed!`);
      console.error(`[CartService] Status: ${(error as any).response?.status}`);
      console.error(`[CartService] Data:`, (error as any).response?.data);
      console.error(
        `[CartService] Full URL attempted: ${baseUrl}/products/${productId}`,
      );

      throw new BadRequestException(
        `Product service error: ${(error as any).message}. Check logs for details.`,
      );
    }
  }

  private calculateTotal(items: CartDocument['items']): number {
    return items.reduce((sum, item) => sum + item.subtotal, 0);
  }

  // ← Get or create cart for user
  async getCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      // ← Create empty cart if not exists
      cart = await this.cartRepository.create({
        userId,
        items: [],
        totalAmount: 0,
      } as Omit<CartDocument, '_id'>);
    }

    return cart;
  }

  // ← Add item to cart
  async addItem(userId: string, dto: AddCartItemDto): Promise<CartDocument> {
    const product = await this.getProductInfo(dto.productId);

    let cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      // ← Create new cart with item
      return this.cartRepository.create({
        userId,
        items: [
          {
            productId: dto.productId,
            quantity: dto.quantity,
            unitPrice: product.price,
            subtotal: product.price * dto.quantity,
            name: product.name,
          },
        ],
        totalAmount: product.price * dto.quantity,
      } as Omit<CartDocument, '_id'>);
    }

    // ← Check if item already exists
    const existingItemIndex = cart.items.findIndex(
      (i) => i.productId === dto.productId,
    );

    let updatedItems = [...cart.items];

    if (existingItemIndex !== -1) {
      // ← Update quantity if item exists
      const newQuantity =
        updatedItems[existingItemIndex].quantity + dto.quantity;
      updatedItems[existingItemIndex] = {
        ...updatedItems[existingItemIndex],
        quantity: newQuantity,
        subtotal: product.price * newQuantity,
      };
    } else {
      // ← Add new item
      updatedItems.push({
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice: product.price,
        subtotal: product.price * dto.quantity,
        name: product.name,
      });
    }

    const totalAmount = this.calculateTotal(updatedItems);

    return this.cartRepository.findOneAndUpdate(
      { userId } as any,
      { $set: { items: updatedItems, totalAmount } } as any,
    );
  }

  // ← Update item quantity
  async updateItem(
    userId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartDocument> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    const itemIndex = cart.items.findIndex((i) => i.productId === productId);

    if (itemIndex === -1) {
      throw new BadRequestException(`Item not found in cart: ${productId}`);
    }

    const product = await this.getProductInfo(productId);
    const updatedItems = [...cart.items];

    updatedItems[itemIndex] = {
      ...updatedItems[itemIndex],
      quantity: dto.quantity,
      unitPrice: product.price,
      subtotal: product.price * dto.quantity,
    };

    const totalAmount = this.calculateTotal(updatedItems);

    return this.cartRepository.findOneAndUpdate(
      { userId } as any,
      { $set: { items: updatedItems, totalAmount } } as any,
    );
  }

  // ← Remove item from cart
  async removeItem(userId: string, productId: string): Promise<CartDocument> {
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart) {
      throw new BadRequestException('Cart not found');
    }

    const updatedItems = cart.items.filter((i) => i.productId !== productId);

    const totalAmount = this.calculateTotal(updatedItems);

    return this.cartRepository.findOneAndUpdate(
      { userId } as any,
      { $set: { items: updatedItems, totalAmount } } as any,
    );
  }

  // ← Clear entire cart
  async clearCart(userId: string): Promise<CartDocument> {
    return this.cartRepository.findOneAndUpdate(
      { userId } as any,
      { $set: { items: [], totalAmount: 0 } } as any,
    );
  }

  async checkout(
    userId: string,
    shippingAddress?: string,
  ): Promise<OrderDocument> {
    console.log(`[Checkout] Starting checkout for userId: ${userId}`);

    // Step 1 — Get cart
    const cart = await this.cartRepository.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      console.warn(
        `[Checkout] Aborted: Cart is empty or not found for user ${userId}`,
      );
      throw new BadRequestException('Cart is empty');
    }
    console.log(`[Checkout] Cart found. Items count: ${cart.items.length}`);

    // Step 2 — Build createOrderDto
    const createOrderDto = {
      items: cart.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
      shippingAddress,
    };
    console.log(
      `[Checkout] Order DTO prepared:`,
      JSON.stringify(createOrderDto),
    );

    // Step 3 — Create order
    try {
      const order = await this.ordersService.create(createOrderDto, userId);
      console.log(
        `[Checkout] Order created successfully. OrderId: ${order._id}`,
      );

      // Step 4 — Clear cart
      console.log(`[Checkout] Attempting to clear cart for user: ${userId}`);
      await this.cartRepository.findOneAndUpdate(
        { userId } as any,
        { $set: { items: [], totalAmount: 0 } } as any,
      );
      console.log(`[Checkout] Cart cleared successfully.`);

      return order;
    } catch (error) {
      console.error(
        `[Checkout] Error during order creation or cart clearing:`,
        (error as Error).message,
      );
      throw error;
    }
  }
}
