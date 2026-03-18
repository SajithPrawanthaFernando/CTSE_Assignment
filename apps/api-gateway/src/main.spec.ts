import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
}));

jest.mock('cookie-parser', () => jest.fn(() => 'cookieParserMiddleware'));

jest.mock('dotenv', () => ({ config: jest.fn() }));

jest.mock('./app.module', () => ({ AppModule: class AppModule {} }));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAppMock() {
  return {
    enableCors: jest.fn(),
    use: jest.fn(),
    listen: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('main.ts', () => {
  let bootstrap: () => Promise<any>;

  beforeEach(async () => {
    jest.clearAllMocks();
    delete process.env.GATEWAY_HTTP_PORT;
    jest.spyOn(Logger, 'log').mockImplementation(() => {});
    bootstrap = (await import('./main')).bootstrap;
  });

  // ─── dotenv ────────────────────────────────────────────────────────────────

  it('should call dotenv.config with the gateway .env path', () => {
    expect(dotenv.config).toHaveBeenCalledWith({
      path: 'apps/api-gateway/.env',
    });
  });

  // ─── NestFactory.create ────────────────────────────────────────────────────

  it('should call NestFactory.create once', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledTimes(1);
  });

  it('should call NestFactory.create with AppModule', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
  });

  it('should return the app instance', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    const result = await bootstrap();

    expect(result).toBe(appMock);
  });

  it('should propagate rejection from NestFactory.create', async () => {
    (NestFactory.create as any).mockRejectedValue(new Error('Module init failed'));

    await expect(bootstrap()).rejects.toThrow('Module init failed');
  });

  // ─── enableCors ────────────────────────────────────────────────────────────

  it('should call enableCors with credentials: true', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: true }),
    );
  });

  it('should call enableCors with localhost:3000 as an allowed origin', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    const { origin } = appMock.enableCors.mock.calls[0][0];
    expect(origin).toContain('http://localhost:3000');
  });

  it('should call enableCors with localhost:4200 as an allowed origin', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    const { origin } = appMock.enableCors.mock.calls[0][0];
    expect(origin).toContain('http://localhost:4200');
  });

  it('should call enableCors exactly once', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.enableCors).toHaveBeenCalledTimes(1);
  });

  // ─── cookieParser middleware ───────────────────────────────────────────────

  it('should register cookieParser middleware via app.use()', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.use).toHaveBeenCalledTimes(1);
  });

  it('should pass the return value of cookieParser() to app.use()', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.use).toHaveBeenCalledWith('cookieParserMiddleware');
  });

  // ─── app.listen ────────────────────────────────────────────────────────────

  it('should listen on default port 3009 when GATEWAY_HTTP_PORT is not set', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.listen).toHaveBeenCalledWith(3009, '0.0.0.0');
  });

  it('should listen on GATEWAY_HTTP_PORT when the env var is set', async () => {
    process.env.GATEWAY_HTTP_PORT = '5000';
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.listen).toHaveBeenCalledWith('5000', '0.0.0.0');
  });

  it('should always bind to 0.0.0.0 regardless of port', async () => {
    process.env.GATEWAY_HTTP_PORT = '8080';
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.listen).toHaveBeenCalledWith(expect.anything(), '0.0.0.0');
  });

  it('should call listen exactly once', async () => {
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(appMock.listen).toHaveBeenCalledTimes(1);
  });

  it('should propagate rejection from app.listen()', async () => {
    const appMock = {
      ...makeAppMock(),
      listen: jest.fn().mockRejectedValue(new Error('Port in use')),
    };
    (NestFactory.create as any).mockResolvedValue(appMock);

    await expect(bootstrap()).rejects.toThrow('Port in use');
  });

  // ─── Logger ────────────────────────────────────────────────────────────────

  it('should log once after the app starts', async () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('should include the default port 3009 in the log message', async () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('3009'));
  });

  it('should include the custom port in the log message', async () => {
    process.env.GATEWAY_HTTP_PORT = '7777';
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});
    const appMock = makeAppMock();
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('7777'));
  });

  it('should not log if listen() throws', async () => {
    const logSpy = jest.spyOn(Logger, 'log').mockImplementation(() => {});
    const appMock = {
      ...makeAppMock(),
      listen: jest.fn().mockRejectedValue(new Error('crash')),
    };
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap().catch(() => {});

    expect(logSpy).not.toHaveBeenCalled();
  });

  // ─── Module shape ──────────────────────────────────────────────────────────

  it('should export bootstrap as a function', () => {
    expect(typeof bootstrap).toBe('function');
  });

  it('should not auto-call bootstrap on import', () => {
    expect(NestFactory.create).not.toHaveBeenCalled();
  });

  // ─── Call ordering ─────────────────────────────────────────────────────────

  it('should call enableCors before listen', async () => {
    const order: string[] = [];
    const appMock: any = {
      enableCors: jest.fn(() => order.push('enableCors')),
      use: jest.fn(() => order.push('use')),
      listen: jest.fn(() => { order.push('listen'); return Promise.resolve(); }),
    };
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(order.indexOf('enableCors')).toBeLessThan(order.indexOf('listen'));
  });

  it('should register cookieParser middleware before listen', async () => {
    const order: string[] = [];
    const appMock: any = {
      enableCors: jest.fn(() => order.push('enableCors')),
      use: jest.fn(() => order.push('use')),
      listen: jest.fn(() => { order.push('listen'); return Promise.resolve(); }),
    };
    (NestFactory.create as any).mockResolvedValue(appMock);

    await bootstrap();

    expect(order.indexOf('use')).toBeLessThan(order.indexOf('listen'));
  });
});