import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard, Roles } from '@app/common';
import { RolesGuard } from '@app/common/auth/roles.guard';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Post()
  @ApiOperation({
    summary: 'Create a new order (validates products via Products service)',
  })
  @ApiResponse({ status: 201, description: 'Order created.' })
  @ApiResponse({ status: 400, description: 'Invalid product or request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  create(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    const userId = req.user?.userId || req.user?.sub;
    return this.ordersService.create(createOrderDto, userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'List all orders (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of orders.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only.' })
  findAll() {
    return this.ordersService.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('my-orders')
  @ApiOperation({ summary: 'Get my orders (extracted from JWT token)' })
  @ApiResponse({
    status: 200,
    description: 'List of orders for logged in user.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMyOrders(@Request() req) {
    const userId = req.user?.userId || req.user?.sub;
    return this.ordersService.findByUserId(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('by-user/:userId')
  @Roles('admin') // ← Admin only
  @ApiOperation({ summary: 'List orders for a specific user (Admin only)' })
  @ApiResponse({ status: 200, description: 'List of orders for the user.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only.' })
  @ApiParam({ name: 'userId', description: 'User ID to filter orders' })
  findByUserId(@Param('userId') userId: string) {
    return this.ordersService.findByUserId(userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @ApiOperation({ summary: 'Get order by ID' })
  @ApiResponse({ status: 200, description: 'Order found.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id')
  @ApiOperation({
    summary: 'Update order items or shipping address (PENDING orders only)',
  })
  @ApiResponse({ status: 200, description: 'Order updated.' })
  @ApiResponse({ status: 400, description: 'Cannot update non-PENDING order.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Patch(':id/status')
  @Roles('admin') // ← Admin only
  @ApiOperation({ summary: 'Update order status (Admin only)' })
  @ApiResponse({ status: 200, description: 'Order status updated.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin only.' })
  updateStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateOrderStatusDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an order' })
  @ApiResponse({ status: 204, description: 'Order deleted.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }
}
