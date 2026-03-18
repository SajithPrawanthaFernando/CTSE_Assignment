import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { AbstractRepository } from '@app/common';
import { ProductDocument } from './schemas/product.schema';

@Injectable()
export class ProductsRepository extends AbstractRepository<ProductDocument> {
  protected readonly logger = new Logger(ProductsRepository.name);

  constructor(
    @InjectModel(ProductDocument.name)
    productModel: Model<ProductDocument>,
  ) {
    super(productModel);
  }

  async findWithPagination(
    filter: FilterQuery<ProductDocument>,
    sort: Record<string, 1 | -1>,
    skip: number,
    limit: number,
  ): Promise<{ data: ProductDocument[]; total: number }> {
    const [data, total] = await Promise.all([
      this.model.find(filter).sort(sort).skip(skip).limit(limit).lean().exec(),
      this.model.countDocuments(filter),
    ]);
    return { data: data as ProductDocument[], total };
  }

  async findByIds(ids: Types.ObjectId[]): Promise<ProductDocument[]> {
    if (ids.length === 0) return [];
    const docs = await this.model.find({ _id: { $in: ids } }).lean().exec();
    return docs as ProductDocument[];
  }
}
