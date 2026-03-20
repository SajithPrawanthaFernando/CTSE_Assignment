import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'prod_123' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  // ← userId REMOVED from body

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({ example: '123 Main St, City', required: false })
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}