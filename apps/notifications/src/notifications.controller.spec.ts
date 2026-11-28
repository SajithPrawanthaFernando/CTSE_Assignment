import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '@app/common';
import { RolesGuard } from '@app/common/auth/roles.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    notifyEmail: jest.fn().mockResolvedValue(undefined),
    createInAppNotification: jest.fn().mockResolvedValue({ _id: 'notif_123' }),
    getUserNotifications: jest.fn().mockResolvedValue([{ _id: 'notif_123' }]),
    markAllAsRead: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteNotification: jest.fn().mockResolvedValue({ _id: 'notif_123' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('notifyEmail', () => {
    it('should call notifyEmail on the service', async () => {
      const dto = { email: 'test@test.com', subject: 'Test', text: 'Test' };
      await controller.notifyEmail(dto);
      expect(service.notifyEmail).toHaveBeenCalledWith(dto);
    });
  });

  describe('createInAppNotification', () => {
    it('should call createInAppNotification on the service', async () => {
      const dto = {
        userId: 'user_123',
        title: 'Title',
        message: 'Message',
        type: 'INFO',
      };
      const result = await controller.createInAppNotification(dto);
      expect(service.createInAppNotification).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ _id: 'notif_123' });
    });
  });

  describe('getInAppNotifications', () => {
    it('should extract userId from req and call getUserNotifications', async () => {
      const mockReq = { user: { _id: 'user_123' } };
      const result = await controller.getInAppNotifications(mockReq);
      
      expect(service.getUserNotifications).toHaveBeenCalledWith('user_123');
      expect(result).toEqual([{ _id: 'notif_123' }]);
    });

    it('should extract sub from req if _id is missing', async () => {
      const mockReq = { user: { sub: 'user_456' } };
      await controller.getInAppNotifications(mockReq);
      expect(service.getUserNotifications).toHaveBeenCalledWith('user_456');
    });
  });

  describe('markAllAsRead', () => {
    it('should extract userId and call markAllAsRead', async () => {
      const mockReq = { user: { _id: 'user_123' } };
      const result = await controller.markAllAsRead(mockReq);
      
      expect(service.markAllAsRead).toHaveBeenCalledWith('user_123');
      expect(result).toEqual({ success: true });
    });
  });

  describe('deleteNotification', () => {
    it('should call deleteNotification with the provided ID', async () => {
      const result = await controller.deleteNotification('notif_123');
      expect(service.deleteNotification).toHaveBeenCalledWith('notif_123');
      expect(result).toEqual({ _id: 'notif_123' });
    });
  });
});