// apps/products/src/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseArrayPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';

// ← JwtAuthGuard removed entirely — gateway handles auth before forwarding

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a product (admin only - via API Gateway)' })
  @ApiResponse({ status: 201, description: 'Product created.' })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'List products with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Paginated list of products.' })
  findAll(@Query() query: QueryProductsDto) {
    return this.productsService.findAll(query);
  }

  @Get('bulk')
  @ApiOperation({ summary: 'Get multiple products by IDs (integration: for Orders service)' })
  @ApiResponse({ status: 200, description: 'List of products.' })
  findByIds(
    @Query(
      'ids',
      new ParseArrayPipe({ items: String, separator: ',', optional: true }),
    )
    ids: string[] = [],
  ) {
    return this.productsService.findByIds(ids || []);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({ status: 200, description: 'Product found.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product (admin only - via API Gateway)' })
  @ApiResponse({ status: 200, description: 'Product updated.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product (admin only - via API Gateway)' })
  @ApiResponse({ status: 200, description: 'Product deleted.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}