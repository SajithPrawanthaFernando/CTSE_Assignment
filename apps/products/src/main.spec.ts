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

// ─── Shared state populated in the single top-level beforeAll ─────────────────

let appMock: any;
let realFilter: any;
let consoleSpy: any;
let loggerErrorSpy: any;
let loggerDebugSpy: any;

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Boot main.ts exactly once and capture everything ─────────────────────────

beforeAll(async () => {
  consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  appMock = {
    get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
    useGlobalFilters: jest.fn(),
    enableCors: jest.fn(),
    useGlobalPipes: jest.fn(),
    listen: jest.fn(),
  };

  let resolveListen: any;
  const listenDone = new Promise(r => { resolveListen = r; });

  (appMock.listen as any).mockImplementationOnce(() => {
    resolveListen();
    return Promise.resolve();
  });

  (NestFactory.create as any).mockResolvedValueOnce(appMock);

  await import('./main');
  await listenDone;

  // Capture the real AllExceptionsFilter instance registered by bootstrap()
  realFilter = appMock.useGlobalFilters.mock.calls[0][0];

  // Spy on the real filter's logger so all catch() calls are tracked
  loggerErrorSpy = jest.spyOn(realFilter['logger'], 'error').mockImplementation(() => {});
  loggerDebugSpy = jest.spyOn(realFilter['logger'], 'debug').mockImplementation(() => {});
});

afterAll(() => {
  consoleSpy.mockRestore();
  if (loggerErrorSpy) loggerErrorSpy.mockRestore();
  if (loggerDebugSpy) loggerDebugSpy.mockRestore();
});

afterEach(() => {
  if (loggerErrorSpy) loggerErrorSpy.mockClear();
  if (loggerDebugSpy) loggerDebugSpy.mockClear();
});

// ─── bootstrap() tests ───────────────────────────────────────────────────────

describe('products main.ts – bootstrap', () => {
  it('should call NestFactory.create with ProductsModule', () => {
    expect(NestFactory.create).toHaveBeenCalledWith(ProductsModule);
  });

  it('should call NestFactory.create exactly once', () => {
    expect(NestFactory.create).toHaveBeenCalledTimes(1);
  });

  it('should register a global exception filter', () => {
    expect(appMock.useGlobalFilters).toHaveBeenCalledTimes(1);
  });

  it('should pass a filter with a catch method', () => {
    expect(typeof realFilter.catch).toBe('function');
  });

  it('should enable CORS with credentials: true', () => {
    expect(appMock.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: true }),
    );
  });

  it('should enable CORS with origin: true', () => {
    expect(appMock.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ origin: true }),
    );
  });

  it('should call enableCors exactly once', () => {
    expect(appMock.enableCors).toHaveBeenCalledTimes(1);
  });

  it('should register a global ValidationPipe', () => {
    expect(appMock.useGlobalPipes).toHaveBeenCalledTimes(1);
  });

  it('should call SwaggerModule.createDocument once', () => {
    expect(SwaggerModule.createDocument).toHaveBeenCalledTimes(1);
  });

  it('should call SwaggerModule.setup with path "api"', () => {
    expect(SwaggerModule.setup).toHaveBeenCalledWith('api', appMock, expect.anything());
  });

  it('should build swagger document with title "Product Catalog API"', () => {
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

  it('should listen on port 3002', () => {
    expect(appMock.listen).toHaveBeenCalledWith(3002);
  });

  it('should call listen exactly once', () => {
    expect(appMock.listen).toHaveBeenCalledTimes(1);
  });

  it('should log the service URL containing the port', () => {
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3002'));
  });

  it('should log the Swagger UI URL', () => {
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Swagger'));
  });

  it('should log twice after starting', () => {
    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── AllExceptionsFilter.catch() branch coverage ──────────────────────────────
// All calls go through the REAL filter instance registered by bootstrap() so
// Istanbul counts every executed line inside main.ts.

describe('AllExceptionsFilter – getStatus branch', () => {
  it('should use getStatus() when available', () => {
    const res = makeRes();
    realFilter.catch({ getStatus: () => 404 }, makeHost(res, makeReq()));
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('should not include error hint when status is not 500', () => {
    const res = makeRes();
    realFilter.catch({ getStatus: () => 404 }, makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: undefined }));
  });
});

describe('AllExceptionsFilter – plain Error branch', () => {
  it('should default to 500 for a plain Error', () => {
    const res = makeRes();
    realFilter.catch(new Error('boom'), makeHost(res, makeReq()));
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should use the Error message', () => {
    const res = makeRes();
    realFilter.catch(new Error('something broke'), makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'something broke' }),
    );
  });

  it('should include MongoDB hint in response when status is 500', () => {
    const res = makeRes();
    realFilter.catch(new Error('db error'), makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('MongoDB') }),
    );
  });

  it('should include statusCode in the response body', () => {
    const res = makeRes();
    realFilter.catch(new Error('x'), makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 500 }));
  });
});

describe('AllExceptionsFilter – non-Error branch', () => {
  it('should use "Internal server error" for string exceptions', () => {
    const res = makeRes();
    realFilter.catch('string error', makeHost(res, makeReq()));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });

  it('should default to 500 for null exception', () => {
    const res = makeRes();
    realFilter.catch(null, makeHost(res, makeReq()));
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should default to 500 for undefined exception', () => {
    const res = makeRes();
    realFilter.catch(undefined, makeHost(res, makeReq()));
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('AllExceptionsFilter – validation errors branch', () => {
  it('should extract validation errors array from response.message', () => {
    const res = makeRes();
    realFilter.catch(
      { getStatus: () => 400, response: { message: ['required', 'invalid'] } },
      makeHost(res, makeReq()),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed', errors: ['required', 'invalid'] }),
    );
  });

  it('should set message to "Validation failed"', () => {
    const res = makeRes();
    realFilter.catch(
      { getStatus: () => 422, response: { message: ['email invalid'] } },
      makeHost(res, makeReq()),
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
    );
  });

  it('should not set errors when response.message is not an array', () => {
    const res = makeRes();
    realFilter.catch(
      { getStatus: () => 400, response: { message: 'single string' } },
      makeHost(res, makeReq()),
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errors: undefined }));
  });
});

describe('AllExceptionsFilter – logger branch', () => {
  it('should call logger.error with method and url', () => {
    const res = makeRes();
    realFilter.catch(new Error('fail'), makeHost(res, makeReq('POST', '/products')));
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('POST'));
  });

  it('should call logger.debug with stack trace for Error instances', () => {
    const res = makeRes();
    const err = new Error('with stack');
    realFilter.catch(err, makeHost(res, makeReq()));
    expect(loggerDebugSpy).toHaveBeenCalledWith(err.stack);
  });

  it('should not call logger.debug when exception is not an Error', () => {
    const res = makeRes();
    realFilter.catch('no stack', makeHost(res, makeReq()));
    expect(loggerDebugSpy).not.toHaveBeenCalled();
  });
});