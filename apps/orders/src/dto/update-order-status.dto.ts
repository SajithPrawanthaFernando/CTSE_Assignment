import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { OrderStatus } from '../schemas/order.schema';

export class UpdateOrderStatusDto {
  @ApiProperty({ 
    enum: OrderStatus,
    example: 'CONFIRMED',
    description: 'Order status (case-insensitive)',
  })
  @Transform(({ value }) => value?.toUpperCase()) // ← converts any case to uppercase
  @IsEnum(OrderStatus, {
    message: `status must be one of the following values: ${Object.values(OrderStatus).join(', ')}`,
  })
  status: OrderStatus;
}