import { bootstrap } from './main';
import { NestFactory } from '@nestjs/core';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

describe('API Gateway main.ts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.GATEWAY_HTTP_PORT;
  });

  it('should enable CORS, use cookieParser, and listen on default port 3000', async () => {
    const appMock: any = {
      enableCors: jest.fn(),
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    (NestFactory.create as any).mockResolvedValue(appMock);

    const app = await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledTimes(1);

    expect(appMock.enableCors).toHaveBeenCalledWith({
      origin: ['http://localhost:3000', 'http://localhost:4200'],
      credentials: true,
    });

    expect(appMock.use).toHaveBeenCalledTimes(1);
    expect(appMock.listen).toHaveBeenCalledWith(3009, '0.0.0.0'); // ← number not string
    expect(app).toBe(appMock);
  });

  it('should listen on env port when GATEWAY_HTTP_PORT is set', async () => {
    process.env.GATEWAY_HTTP_PORT = '4000';

    const appMock: any = {
      enableCors: jest.fn(),
      use: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };

    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.listen).toHaveBeenCalledWith('4000', '0.0.0.0'); // ← string because it comes from process.env
  });
});