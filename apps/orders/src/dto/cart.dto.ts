import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Min, IsNumber } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ example: 'prod_001' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Min(1)
  quantity: number;
}

export class UpdateCartItemDto {
  @ApiProperty({ example: 3, minimum: 1 })
  @Min(1)
  quantity: number;
}