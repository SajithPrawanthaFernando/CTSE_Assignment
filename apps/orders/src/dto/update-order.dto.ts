import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateOrderItemDto {
  @ApiProperty({ example: 'prod_001' })
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, minimum: 0 })
  @Min(0) // ← 0 means remove item
  quantity: number;
}

export class UpdateOrderDto {
  @ApiProperty({ type: [UpdateOrderItemDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateOrderItemDto)
  items?: UpdateOrderItemDto[];

  @ApiProperty({ example: '456 New St, City', required: false })
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}