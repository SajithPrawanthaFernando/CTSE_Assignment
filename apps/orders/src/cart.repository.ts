import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '@app/common';
import { CartDocument } from './schemas/cart.schema';

@Injectable()
export class CartRepository extends AbstractRepository<CartDocument> {
  protected readonly logger = new Logger(CartRepository.name);

  constructor(
    @InjectModel(CartDocument.name) cartModel: Model<CartDocument>,
  ) {
    super(cartModel);
  }

  async findByUserId(userId: string): Promise<CartDocument | null> {
    try {
      return await this.findOne({ userId } as any);
    } catch {
      return null; // ← return null if cart not found
    }
  }
}