/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from './schemas/notification.schema';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

// 1. Mock External Libraries (Nodemailer and Axios)
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ accepted: ['test@example.com'] }),
  }),
}));

jest.mock('axios');
const mockedAxios = axios as any;

describe('NotificationsService', () => {
  let service: NotificationsService;
  let configService: ConfigService;

  const mockNotification = {
    _id: 'notif_123',
    userId: 'user_123',
    title: 'Order Confirmed',
    message: 'Your order is being processed!',
    type: 'ORDER',
    isRead: false,
    createdAt: new Date(),
  };

  // 2. Setup Mongoose Chaining Mocks (find -> sort -> exec)
  const mockExec = jest.fn().mockResolvedValue([mockNotification]);
  const mockSort = jest.fn().mockReturnValue({ exec: mockExec });
  const mockFind = jest.fn().mockReturnValue({ sort: mockSort });

  // 3. Mock the Mongoose Model
  const mockNotificationModel = {
    create: jest.fn().mockResolvedValue(mockNotification),
    find: mockFind,
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findByIdAndDelete: jest.fn().mockResolvedValue(mockNotification),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const envVars = {
                SMTP_USER: 'test@bistro.com',
                NOTIFYLK_USER_ID: 'notify_user',
                NOTIFYLK_API_KEY: 'notify_api',
                NOTIFYLK_SENDER_ID: 'notify_sender',
              };
              return envVars[key];
            }),
          },
        },
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createInAppNotification', () => {
    it('should create and return a notification', async () => {
      const dto = {
        userId: 'user_123',
        title: 'Order Confirmed',
        message: 'Your order is being processed!',
        type: 'ORDER',
      };

      const result = await service.createInAppNotification(dto);

      expect(result).toEqual(mockNotification);
      expect(mockNotificationModel.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('getUserNotifications', () => {
    it('should return a sorted array of notifications for a user', async () => {
      const result = await service.getUserNotifications('user_123');

      expect(result).toEqual([mockNotification]);
      expect(mockNotificationModel.find).toHaveBeenCalledWith({ userId: 'user_123' });
      expect(mockSort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(mockExec).toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('should update unread notifications to read for a specific user', async () => {
      const result = await service.markAllAsRead('user_123');

      expect(result).toEqual({ modifiedCount: 1 });
      expect(mockNotificationModel.updateMany).toHaveBeenCalledWith(
        { userId: 'user_123', isRead: false },
        { $set: { isRead: true } },
      );
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification by ID', async () => {
      const result = await service.deleteNotification('notif_123');

      expect(result).toEqual(mockNotification);
      expect(mockNotificationModel.findByIdAndDelete).toHaveBeenCalledWith('notif_123');
    });
  });

  describe('notifyEmail', () => {
    it('should format and send an email successfully', async () => {
      const dto = {
        email: 'customer@example.com',
        subject: 'Your GustoBistro Order',
        text: 'Order placed',
      };

      const transporter = nodemailer.createTransport();
      await service.notifyEmail(dto);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'GustoBistro <test@bistro.com>',
          to: dto.email,
          subject: dto.subject,
          text: dto.text,
        }),
      );
    });

    it('should generate HTML content when orderData is provided', async () => {
      const dto = {
        email: 'customer@example.com',
        subject: 'Order Confirmed',
        text: '',
        orderData: {
          customerName: 'John',
          fullname: 'John Doe',
          address: '123 Main St',
          phone: '1234567890',
          items: [{ productId: 'prod_1', quantity: 2, subtotal: 20.0 }],
          totalAmount: 20.0,
        },
      };

      const transporter = nodemailer.createTransport();
      await service.notifyEmail(dto);

      expect(transporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('ORDER CONFIRMED'),
        }),
      );
    });

    it('should catch and log errors if email sending fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const transporter = nodemailer.createTransport();
      
      // Fixed the TS error here by using "any" instead of "jest.Mock"
      (transporter.sendMail as any).mockRejectedValueOnce(
        new Error('SMTP failure'),
      );

      await service.notifyEmail({ email: 'test@example.com' } as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send email:',
        'SMTP failure',
      );
      consoleSpy.mockRestore();
    });
  });
});