import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
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

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('products main.ts', () => {
  let consoleSpy: any;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  // ─── NestFactory.create ───────────────────────────────────────────────────

  it('should call NestFactory.create with ProductsModule', async () => {
    const { ProductsModule } = require('./products.module');
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(NestFactory.create).toHaveBeenCalledWith(ProductsModule);
  });

  it('should call NestFactory.create exactly once', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(NestFactory.create).toHaveBeenCalledTimes(1);
  });

  // ─── Global filter ────────────────────────────────────────────────────────

  it('should register a global exception filter', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(appMock.useGlobalFilters).toHaveBeenCalledTimes(1);
  });

  it('should pass an AllExceptionsFilter instance to useGlobalFilters', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    const [filter] = appMock.useGlobalFilters.mock.calls[0];
    expect(typeof filter.catch).toBe('function');
  });

  // ─── CORS ─────────────────────────────────────────────────────────────────

  it('should enable CORS with credentials: true', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(appMock.enableCors).toHaveBeenCalledWith(
      expect.objectContaining({ credentials: true }),
    );
  });

  it('should call enableCors exactly once', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(appMock.enableCors).toHaveBeenCalledTimes(1);
  });

  // ─── ValidationPipe ───────────────────────────────────────────────────────

  it('should register a global ValidationPipe', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(appMock.useGlobalPipes).toHaveBeenCalledTimes(1);
  });

  // ─── Swagger ──────────────────────────────────────────────────────────────

  it('should call SwaggerModule.createDocument once', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(SwaggerModule.createDocument).toHaveBeenCalledTimes(1);
  });

  it('should call SwaggerModule.setup with path "api"', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(SwaggerModule.setup).toHaveBeenCalledWith('api', appMock, expect.anything());
  });

  it('should build swagger document with title "Product Catalog API"', async () => {
    const builderInstance: any = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addTag: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    };
    (DocumentBuilder as any).mockImplementationOnce(() => builderInstance);

    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(builderInstance.setTitle).toHaveBeenCalledWith('Product Catalog API');
  });

  it('should add "products" tag to swagger document', async () => {
    const builderInstance: any = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addTag: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    };
    (DocumentBuilder as any).mockImplementationOnce(() => builderInstance);

    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(builderInstance.addTag).toHaveBeenCalledWith('products');
  });

  it('should set swagger version to "1.0"', async () => {
    const builderInstance: any = {
      setTitle: jest.fn().mockReturnThis(),
      setDescription: jest.fn().mockReturnThis(),
      setVersion: jest.fn().mockReturnThis(),
      addTag: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    };
    (DocumentBuilder as any).mockImplementationOnce(() => builderInstance);

    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(builderInstance.setVersion).toHaveBeenCalledWith('1.0');
  });

  // ─── Port / listen ────────────────────────────────────────────────────────

  it('should listen on port from ConfigService', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(4000) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(appMock.listen).toHaveBeenCalledWith(4000);
  });

  it('should listen on default port 3002 when ConfigService returns undefined', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(undefined) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(appMock.listen).toHaveBeenCalledWith(3002);
  });

  it('should call listen exactly once', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(appMock.listen).toHaveBeenCalledTimes(1);
  });

  // ─── Console logs ─────────────────────────────────────────────────────────

  it('should log the service URL containing the port', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('3002'));
  });

  it('should log the Swagger UI URL', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Swagger'));
  });

  it('should log twice after starting', async () => {
    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    expect(consoleSpy).toHaveBeenCalledTimes(2);
  });
});

// ─── AllExceptionsFilter unit tests ───────────────────────────────────────────

describe('AllExceptionsFilter', () => {
  let filter: any;
  let loggerErrorSpy: any;
  let loggerDebugSpy: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const appMock: any = {
      get: jest.fn().mockReturnValue({ get: jest.fn().mockReturnValue(3002) }),
      useGlobalFilters: jest.fn(),
      enableCors: jest.fn(),
      useGlobalPipes: jest.fn(),
      listen: jest.fn().mockResolvedValue(undefined),
    };
    (NestFactory.create as any).mockResolvedValueOnce(appMock);

    jest.isolateModules(() => { require('./main'); });
    await new Promise(r => setTimeout(r, 50));

    filter = appMock.useGlobalFilters.mock.calls[0][0];

    // Spy on the filter's own logger instance after construction
    loggerErrorSpy = jest.spyOn(filter['logger'], 'error').mockImplementation(() => {});
    loggerDebugSpy = jest.spyOn(filter['logger'], 'debug').mockImplementation(() => {});
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

  // ─── HTTP exception ───────────────────────────────────────────────────────

  it('should use getStatus() from HttpException', () => {
    const res = makeRes();

    filter.catch({ getStatus: () => 404 }, makeHost(res, makeReq()));

    expect(res.status).toHaveBeenCalledWith(404);
  });

  // ─── Plain Error ──────────────────────────────────────────────────────────

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

  // ─── Non-Error exception ──────────────────────────────────────────────────

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

  // ─── Validation errors ────────────────────────────────────────────────────

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
    const exception = {
      getStatus: () => 422,
      response: { message: ['email is invalid'] },
    };

    filter.catch(exception, makeHost(res, makeReq()));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Validation failed' }),
    );
  });

  it('should not set errors when response.message is not an array', () => {
    const res = makeRes();
    const exception = {
      getStatus: () => 400,
      response: { message: 'single string message' },
    };

    filter.catch(exception, makeHost(res, makeReq()));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors: undefined }),
    );
  });

  // ─── Logger ───────────────────────────────────────────────────────────────

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

  // ─── Response shape ───────────────────────────────────────────────────────

  it('should always include statusCode in the response body', () => {
    const res = makeRes();

    filter.catch(new Error('x'), makeHost(res, makeReq()));

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });
});