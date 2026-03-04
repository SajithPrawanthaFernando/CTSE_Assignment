import { bootstrap } from './main';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { Transport } from '@nestjs/microservices';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

describe('Auth main bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should configure app and start services', async () => {
    const configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'TCP_PORT') return 3002;
        if (key === 'HTTP_PORT') return 3001;
        return undefined;
      }),
    };

    const appMock: any = {
      get: jest.fn((token: any) => {
        if (token === ConfigService) return configServiceMock;
        if (token === Logger) return { log: jest.fn() };
        return undefined;
      }),
      enableCors: jest.fn(),
      connectMicroservice: jest.fn(),
      use: jest.fn(),
      useGlobalPipes: jest.fn(),
      useLogger: jest.fn(),
      startAllMicroservices: jest.fn().mockResolvedValue(undefined),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    (NestFactory.create as any).mockResolvedValue(appMock);

    const app = await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledTimes(1);

    expect(appMock.enableCors).toHaveBeenCalledWith({
      origin: 'http://localhost:4200',
      credentials: true,
    });

    expect(appMock.connectMicroservice).toHaveBeenCalledWith({
      transport: Transport.TCP,
      options: { host: '0.0.0.0', port: 3002 },
    });

    expect(appMock.useGlobalPipes).toHaveBeenCalledTimes(1);
    expect(appMock.useLogger).toHaveBeenCalledTimes(1);

    expect(appMock.startAllMicroservices).toHaveBeenCalledTimes(1);
    expect(appMock.listen).toHaveBeenCalledWith(3001);

    expect(app).toBe(appMock);
  });
});
