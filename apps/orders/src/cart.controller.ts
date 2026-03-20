import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CartService } from './cart.service';
import { AddCartItemDto, UpdateCartItemDto } from './dto/cart.dto';
import { JwtAuthGuard } from '@app/common';
import { RolesGuard } from '@app/common/auth/roles.guard';

// ← DTO for checkout body
class CheckoutDto {
  @ApiProperty({ example: '123 Main St, City', required: false })
  @IsOptional()
  @IsString()
  shippingAddress?: string;
}

@ApiTags('cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get('my-cart')
  @ApiOperation({ summary: 'Get my cart' })
  @ApiResponse({ status: 200, description: 'Cart retrieved.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getCart(@Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart' })
  @ApiResponse({ status: 201, description: 'Item added to cart.' })
  @ApiResponse({ status: 400, description: 'Invalid product.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  addItem(@Request() req, @Body() addCartItemDto: AddCartItemDto) {
    const userId = req.user?.userId || req.user?.sub;
    return this.cartService.addItem(userId, addCartItemDto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update item quantity in cart' })
  @ApiResponse({ status: 200, description: 'Item updated.' })
  @ApiResponse({ status: 400, description: 'Item not found in cart.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  updateItem(
    @Request() req,
    @Param('productId') productId: string,
    @Body() updateCartItemDto: UpdateCartItemDto,
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.cartService.updateItem(userId, productId, updateCartItemDto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiResponse({ status: 200, description: 'Item removed.' })
  @ApiResponse({ status: 400, description: 'Item not found in cart.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  removeItem(@Request() req, @Param('productId') productId: string) {
    const userId = req.user?.userId || req.user?.sub;
    return this.cartService.removeItem(userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  @ApiResponse({ status: 200, description: 'Cart cleared.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  clearCart(@Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.cartService.clearCart(userId);
  }

  // ← Updated: checkout now creates order and clears cart
  @Post('checkout')
  @ApiOperation({
    summary: 'Checkout — creates order from cart and clears cart',
  })
  @ApiResponse({ status: 201, description: 'Order created from cart.' })
  @ApiResponse({ status: 400, description: 'Cart is empty.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  checkout(
    @Request() req,
    @Body() body: CheckoutDto, // ← accepts shipping address
  ) {
    const userId = req.user?.userId || req.user?.sub;
    return this.cartService.checkout(userId, body?.shippingAddress);
  }
}
