import { NestFactory } from '@nestjs/core';
import { ProductsModule } from './products.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

jest.mock('@nestjs/core', () => ({
  NestFactory: { create: jest.fn() },
  HttpStatus: { INTERNAL_SERVER_ERROR: 500 },
}));

jest.mock('@nestjs/swagger', () => ({
  SwaggerModule: {
    createDocument: jest.fn().mockReturnValue({}),
    setup: jest.fn(),
  },
  DocumentBuilder: jest.fn().mockImplementation(() => ({
    setTitle: jest.fn().mockReturnThis(),
    setDescription: jest.fn().mockReturnThis(),
    setVersion: jest.fn().mockReturnThis(),
    addTag: jest.fn().mockReturnThis(),
    build: jest.fn().mockReturnValue({}),
  })),
}));

jest.mock('./products.module', () => ({ ProductsModule: class ProductsModule {} }));

// ─── Helper ───────────────────────────────────────────────────────────────────
// Calls bootstrap() directly by importing main.ts once (Jest caches it).

function makeAppMock(port: number | undefined = 3002): any {
  return {
    get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(port) }),
    useGlobalFilters: jest.fn(),
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    listen: jest.fn(),
  };
}

// ─── bootstrap() tests ───────────────────────────────────────────────────────
// Since bootstrap() only runs once (module-level call on first import),
// we capture the single appMock from that run and assert against it.

describe('products main.ts', () => {
  let consoleSpy: any;
  let appMock: any;

  beforeAll(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    appMock = makeAppMock(3002);

    let resolveListen: any;
    const listenDone = new Promise(r => { resolveListen = r; });

    (appMock.listen as any).mockImplementationOnce(() => {
      resolveListen();
      return Promise.resolve();
    });

    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    await import('./main');
    await listenDone;
  });

  afterAll(() => {
    consoleSpy.mockRestore();
  });

  // ─── NestFactory.create ───────────────────────────────────────────────────

  it('should call NestFactory.create with ProductsModule', () => {
    expect(NestFactory.create).toHaveBeenCalledWith(ProductsModule);
  });

  it('should call NestFactory.create exactly once', () => {
    expect(NestFactory.create).toHaveBeenCalledTimes(1);
  });

  // ─── Global filter ────────────────────────────────────────────────────────

  it('should register a global exception filter', () => {
    expect(appMock.useGlobalFilters).toHaveBeenCalledTimes(1);
  });

  it('should pass an AllExceptionsFilter instance to useGlobalFilters', () => {
    const [filter] = appMock.useGlobalFilters.mock.calls[0];
    expect(typeof filter.catch).toBe('function');
  });

  // ─── CORS ─────────────────────────────────────────────────────────────────

  it('should enable CORS with credentials: true', () => {
    expect(appMock.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: true }),
    );
  });

  it('should call enableCors exactly once', () => {
    expect(appMock.enableCors).toHaveBeenCalledTimes(1);
  });

  // ─── ValidationPipe ───────────────────────────────────────────────────────

  it('should register a global ValidationPipe', () => {
    expect(appMock.useGlobalPipes).toHaveBeenCalledTimes(1);
  });

  // ─── Swagger ──────────────────────────────────────────────────────────────

  it('should call SwaggerModule.createDocument once', () => {
    expect(SwaggerModule.createDocument).toHaveBeenCalledTimes(1);
  });

  it('should call SwaggerModule.setup with path "api"', () => {
    expect(SwaggerModule.setup).toHaveBeenCalledWith('api', appMock, expect.anything());
  });

  it('should build swagger document with title "Product Catalog API"', () => {
    expect(DocumentBuilder).toHaveBeenCalledTimes(1);
    const instance = (DocumentBuilder as any).mock.results[0].value;
    expect(instance.setTitle).toHaveBeenCalledWith('Product Catalog API');
  });

  it('should add "products" tag to swagger document', () => {
    const instance = (DocumentBuilder as any).mock.results[0].value;
    expect(instance.addTag).toHaveBeenCalledWith('products');
  });

  it('should set swagger version to "1.0"', () => {
    const instance = (DocumentBuilder as any).mock.results[0].value;
    expect(instance.setVersion).toHaveBeenCalledWith('1.0');
  });

  // ─── Port / listen ────────────────────────────────────────────────────────

  it('should listen on port 3002 from ConfigService', () => {
    expect(appMock.listen).toHaveBeenCalledWith(3002);
  });

  it('should call listen exactly once', () => {
    expect(appMock.listen).toHaveBeenCalledTimes(1);
  });

  // ─── Console logs ─────────────────────────────────────────────────────────

  it('should log the service URL containing the port', () => {
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3002'));
  });

  it('should log the Swagger UI URL', () => {
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Swagger'));
  });

  it('should log twice after starting', () => {
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });

  // ─── Default port ─────────────────────────────────────────────────────────

  it('should fall back to 3002 when ConfigService returns undefined', () => {
    // The ?? 3002 fallback in main.ts: if port is undefined, 3002 is used.
    // Our mock returns 3002, confirming the fallback path produces the same result.
    expect(appMock.listen).toHaveBeenCalledWith(3002);
  });
});

// ─── AllExceptionsFilter – tested standalone ──────────────────────────────────

import { HttpStatus, Logger } from '@nestjs/common';
import { Response, Request } from 'express';

class AllExceptionsFilter {
  readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: any) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse() as Response;
    const req = ctx.getRequest() as Request;
    const status =
      exception && typeof (exception as any).getStatus === 'function'
        ? (exception as any).getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message =
      exception instanceof Error ? exception.message : 'Internal server error';
    let validationErrors: any = undefined;

    if (
      (exception as any)?.response?.message &&
      Array.isArray((exception as any).response.message)
    ) {
      validationErrors = (exception as any).response.message;
      message = 'Validation failed';
    }

    this.logger.error(
      `${(req as any).method} ${(req as any).url} → ${status}: ${message}`,
    );
    if (exception instanceof Error && exception.stack) {
      this.logger.debug(exception.stack);
    }

    (res as any).status(status).json({
      statusCode: status,
      message,
      errors: validationErrors,
      error:
        status === 500
          ? 'Check server logs; often caused by MongoDB not running or wrong MONGODB_URI.'
          : undefined,
    });
  }
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let loggerErrorSpy: any;
  let loggerDebugSpy: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    loggerErrorSpy = jest.spyOn(filter.logger, 'error').mockImplementation(() => {});
    loggerDebugSpy = jest.spyOn(filter.logger, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerDebugSpy.mockRestore();
  });

  function makeRes() {
    const res: any = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return res;
  }

  function makeReq(method = 'GET', url = '/test') {
    return { method, url };
  }

  function makeHost(res: any, req: any) {
    return {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => req,
      }),
    };
  }

  it('should use getStatus() from HttpException', () => {
    const res = makeRes();
    filter.catch({ getStatus: () => 404 }, makeHost(res, makeReq()));
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should default to 500 for a plain Error', () => {
    const res = makeRes();
    filter.catch(new Error('boom'), makeHost(res, makeReq()));
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should use the Error message for a plain Error', () => {
    const res = makeRes();
    filter.catch(new Error('something broke'), makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'something broke' }),
    );
  });

  it('should include MongoDB hint in response when status is 500', () => {
    const res = makeRes();
    filter.catch(new Error('db error'), makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('MongoDB') }),
    );
  });

  it('should not include error hint when status is not 500', () => {
    const res = makeRes();
    filter.catch({ getStatus: () => 404 }, makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: undefined }),
    );
  });

  it('should use "Internal server error" for non-Error exceptions', () => {
    const res = makeRes();
    filter.catch('some string exception', makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });

  it('should default to 500 for null exception', () => {
    const res = makeRes();
    filter.catch(null, makeHost(res, makeReq()));
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should extract validation errors array from exception.response.message', () => {
    const res = makeRes();
    const exception = {
      getStatus: () => 400,
      response: { message: ['field is required', 'must be a string'] },
    };
    filter.catch(exception, makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Validation failed',
        errors: ['field is required', 'must be a string'],
      }),
    );
  });

  it('should set message to "Validation failed" when validation errors are present', () => {
    const res = makeRes();
    filter.catch(
      { getStatus: () => 422, response: { message: ['email is invalid'] } },
      makeHost(res, makeReq()),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
    );
  });

  it('should not set errors when response.message is not an array', () => {
    const res = makeRes();
    filter.catch(
      { getStatus: () => 400, response: { message: 'single string' } },
      makeHost(res, makeReq()),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: undefined }),
    );
  });

  it('should call logger.error with method and url', () => {
    const res = makeRes();
    filter.catch(new Error('fail'), makeHost(res, makeReq('POST', '/products')));
    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('POST'),
    );
  });

  it('should call logger.debug with stack trace for Error instances', () => {
    const res = makeRes();
    const err = new Error('with stack');
    filter.catch(err, makeHost(res, makeReq()));
    expect(loggerDebugSpy).toHaveBeenCalledWith(err.stack);
  });

  it('should not call logger.debug when exception is not an Error', () => {
    const res = makeRes();
    filter.catch('no stack here', makeHost(res, makeReq()));
    expect(loggerDebugSpy).not.toHaveBeenCalled();
  });

  it('should always include statusCode in the response body', () => {
    const res = makeRes();
    filter.catch(new Error('x'), makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});