import {
  BadRequestException,
  Injectable,
  Inject,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUTH_SERVICE } from '@app/common';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { ProductDocument } from './schemas/product.schema';
import { FilterQuery, Types } from 'mongoose';

@Injectable()
export class ProductsService implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly productsRepository: ProductsRepository,

    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
  ) {}

  async onModuleInit() {
    try {
      await this.authClient.connect();
      this.logger.log(
        'Successfully established TCP connection to Auth Service.',
      );
    } catch (err) {
      this.logger.error(
        'Could not connect to Auth Service via TCP. Ensure it is running on the correct port.',
      );
      this.logger.debug(err);
    }
  }

  async create(createProductDto: CreateProductDto): Promise<ProductDocument> {
    return this.productsRepository.create({
      ...createProductDto,
      stock: createProductDto.stock ?? 0,
      currency: createProductDto.currency ?? 'USD',
      active: createProductDto.active ?? true,
      tags: createProductDto.tags ?? [],
    } as Omit<ProductDocument, '_id'>);
  }

  async findAll(query: QueryProductsDto): Promise<{
    data: ProductDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 50,
      category,
      search,
      active,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const filter: FilterQuery<ProductDocument> = {};

    if (category) filter.category = category;
    if (typeof active === 'boolean') filter.active = active;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };
    const skip = (page - 1) * limit;

    const { data, total } = await this.productsRepository.findWithPagination(
      filter,
      sort,
      skip,
      limit,
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }
    return this.productsRepository.findOne({
      _id: new Types.ObjectId(id),
    } as any);
  }

  async findByIds(ids: string[]): Promise<ProductDocument[]> {
    if (!ids?.length) return [];
    const objectIds = ids
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (!objectIds.length) return [];
    return this.productsRepository.findByIds(objectIds);
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }
    return this.productsRepository.findOneAndUpdate(
      { _id: new Types.ObjectId(id) } as any,
      { $set: updateProductDto },
    );
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }
    await this.productsRepository.findOneAndDelete({
      _id: new Types.ObjectId(id),
    } as any);
  }
}
