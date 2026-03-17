import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '@app/common';
import { OrderDocument } from './schemas/order.schema';

@Injectable()
export class OrdersRepository extends AbstractRepository<OrderDocument> {
  protected readonly logger = new Logger(OrdersRepository.name);

  constructor(
    @InjectModel(OrderDocument.name) orderModel: Model<OrderDocument>,
  ) {
    super(orderModel);
  }

  async findByUserId(userId: string): Promise<OrderDocument[]> {
    return this.find({ userId });
  }

  // ← NEW: Delete order by ID
  async deleteById(id: string): Promise<void> {
    await this.findOneAndDelete({ _id: id } as any);
  }
}