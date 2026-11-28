import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Get,
  Patch,
  Request,
  Delete,
  UseGuards,
  Param,
} from '@nestjs/common';
import { NotifyEmailDto } from './dto/notify-email.dto';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@app/common';
import { RolesGuard } from '@app/common/auth/roles.guard';


@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('email')
  @UsePipes(new ValidationPipe())
  async notifyEmail(@Body() data: NotifyEmailDto) {
    return this.notificationsService.notifyEmail(data);
  }

  @Post('in-app/create')
  async createInAppNotification(
    @Body()
    data: {
      userId: string;
      title: string;
      message: string;
      type: string;
    },
  ) {
    return this.notificationsService.createInAppNotification(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  async getInAppNotifications(@Request() req: any) {
    const userId = req.user?._id || req.user?.sub;
    return this.notificationsService.getUserNotifications(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('read-all')
  async markAllAsRead(@Request() req: any) {
    const userId = req.user?._id || req.user?.sub;
    await this.notificationsService.markAllAsRead(userId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteNotification(@Param('id') id: string) {
    return this.notificationsService.deleteNotification(id);
  }
}