/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { of, throwError } from 'rxjs';
import { NotificationsProxyController } from './notifications-proxy.controller';

describe('NotificationsProxyController', () => {
  let controller: NotificationsProxyController;
  let httpService: HttpService;
  let configService: ConfigService;

  const mockRequest = {
    headers: {
      cookie: 'test-cookie=123',
      authorization: 'Bearer test-token',
      authentication: 'test-auth',
      'content-type': 'application/json',
    },
  } as unknown as Request;

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  // Helper function to test the inline validateStatus: () => true
  const expectValidateStatusToReturnTrue = (mockCallArgs: any[]) => {
    // The config object is either the 2nd arg (for GET/DELETE) or 3rd arg (for POST/PATCH)
    const config = mockCallArgs.length === 2 ? mockCallArgs[1] : mockCallArgs[2];
    expect(config.validateStatus(500)).toBe(true); // Execute the inline function
  };

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsProxyController],
      providers: [
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
            patch: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://mocked-notifications:3010'),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsProxyController>(NotificationsProxyController);
    httpService = module.get<HttpService>(HttpService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('Edge Cases (Headers & Base URL)', () => {
    it('should use default URL if ConfigService returns undefined', async () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const res = mockResponse();
      jest.spyOn(httpService, 'get').mockReturnValue(of({ status: 200, data: {} } as any));

      await controller.getUserNotifications(mockRequest, res);
      expect(httpService.get).toHaveBeenCalledWith(
        'http://localhost:3010/notifications',
        expect.any(Object),
      );
    });

    it('should handle missing headers with fallbacks', async () => {
      // Passes an empty request to trigger the || '' branches in forwardHeaders
      const emptyReq = { headers: {} } as Request;
      const res = mockResponse();
      jest.spyOn(httpService, 'get').mockReturnValue(of({ status: 200, data: {} } as any));

      await controller.getUserNotifications(emptyReq, res);

      const callArgs = (httpService.get as any).mock.calls[0];
      expect(callArgs[1].headers).toEqual({
        cookie: '',
        authorization: '',
        authentication: '',
        'content-type': 'application/json',
      });
    });
  });

  describe('sendEmail', () => {
    const body = { email: 'test@example.com' };

    it('should proxy email request and execute validateStatus', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'post').mockReturnValue(of({ status: 200, data: { success: true } } as any));

      await controller.sendEmail(body, mockRequest, res);

      const callArgs = (httpService.post as any).mock.calls[0];
      expectValidateStatusToReturnTrue(callArgs);
      
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should catch errors and return 502', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('Network Error')));
      await controller.sendEmail(body, mockRequest, res);
      expect(res.status).toHaveBeenCalledWith(502);
    });
  });

  describe('sendSms', () => {
    const body = { to: '1234567890', message: 'Hello' };

    it('should proxy SMS request and execute validateStatus', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'post').mockReturnValue(of({ status: 201, data: {} } as any));

      await controller.sendSms(body, mockRequest, res);

      const callArgs = (httpService.post as any).mock.calls[0];
      expectValidateStatusToReturnTrue(callArgs);
    });

    it('should catch errors and return 502', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('Network Error')));
      await controller.sendSms(body, mockRequest, res);
      expect(res.status).toHaveBeenCalledWith(502);
    });
  });

  describe('createInAppNotification', () => {
    const body = { userId: '1', title: 'Test' };

    it('should proxy in-app creation and execute validateStatus', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'post').mockReturnValue(of({ status: 201, data: {} } as any));

      await controller.createInAppNotification(body, mockRequest, res);

      const callArgs = (httpService.post as any).mock.calls[0];
      expectValidateStatusToReturnTrue(callArgs);
    });

    it('should catch errors and return 502', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'post').mockReturnValue(throwError(() => new Error('Network Error')));
      await controller.createInAppNotification(body, mockRequest, res);
      expect(res.status).toHaveBeenCalledWith(502);
    });
  });

  describe('getUserNotifications', () => {
    it('should proxy GET request and execute validateStatus', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'get').mockReturnValue(of({ status: 200, data: {} } as any));

      await controller.getUserNotifications(mockRequest, res);

      const callArgs = (httpService.get as any).mock.calls[0];
      expectValidateStatusToReturnTrue(callArgs);
    });

    it('should catch errors and return 502', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'get').mockReturnValue(throwError(() => new Error('Network Error')));
      await controller.getUserNotifications(mockRequest, res);
      expect(res.status).toHaveBeenCalledWith(502);
    });
  });

  describe('markAllAsRead', () => {
    it('should proxy PATCH request and execute validateStatus', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'patch').mockReturnValue(of({ status: 200, data: {} } as any));

      await controller.markAllAsRead(mockRequest, res);

      const callArgs = (httpService.patch as any).mock.calls[0];
      expectValidateStatusToReturnTrue(callArgs);
    });

    it('should catch errors and return 502', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'patch').mockReturnValue(throwError(() => new Error('Network Error')));
      await controller.markAllAsRead(mockRequest, res);
      expect(res.status).toHaveBeenCalledWith(502);
    });
  });

  describe('deleteNotification', () => {
    it('should proxy DELETE request and execute validateStatus', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'delete').mockReturnValue(of({ status: 200, data: {} } as any));

      await controller.deleteNotification('notif_123', mockRequest, res);

      const callArgs = (httpService.delete as any).mock.calls[0];
      expectValidateStatusToReturnTrue(callArgs);
    });

    it('should catch errors and return 502', async () => {
      const res = mockResponse();
      jest.spyOn(httpService, 'delete').mockReturnValue(throwError(() => new Error('Network Error')));
      await controller.deleteNotification('notif_123', mockRequest, res);
      expect(res.status).toHaveBeenCalledWith(502);
    });
  });
});