import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // <-- Added ConfigService
import * as Joi from 'joi';
import { LoggerModule, DatabaseModule } from '@app/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import {
  Notification,
  NotificationSchema,
} from './schemas/notification.schema';
import { HttpModule } from '@nestjs/axios';
import { Reflector } from '@nestjs/core'; // <-- Added Reflector

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/notifications/.env',
      validationSchema: Joi.object({
        HTTP_PORT: Joi.number().required(),
        TCP_PORT: Joi.number().required(),
        MONGODB_URI: Joi.string().required(),
        GOOGLE_OAUTH_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_OAUTH_REFRESH_TOKEN: Joi.string().required(),
        SMTP_USER: Joi.string().required(),
        AUTH_HTTP_BASEURL: Joi.string().required(),
      }),
    }),
    
    HttpModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.get('AUTH_HTTP_BASEURL'),
        timeout: 5000,
        maxRedirects: 2,
      }),
      inject: [ConfigService],
    }),
    
    DatabaseModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    LoggerModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    Reflector,
  ],
})
export class NotificationsModule {}