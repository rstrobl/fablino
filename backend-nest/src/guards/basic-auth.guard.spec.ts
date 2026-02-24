import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { BasicAuthGuard } from './basic-auth.guard';

describe('BasicAuthGuard', () => {
  let guard: BasicAuthGuard;
  let configService: ConfigService;

  const mockRequest = {
    headers: {} as any,
  };

  const mockResponse = {
    setHeader: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
  } as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BasicAuthGuard,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<BasicAuthGuard>(BasicAuthGuard);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequest.headers = {};
    (configService.get as jest.Mock).mockReturnValue('fablino2026');
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should throw UnauthorizedException when no authorization header is present', () => {
    expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
  });

  it('should NOT set WWW-Authenticate header on 401 (removed)', () => {
    try {
      guard.canActivate(mockExecutionContext);
    } catch (e) {
      // expected
    }
    expect(mockResponse.setHeader).not.toHaveBeenCalled();
  });

  it('should NOT set WWW-Authenticate header on invalid credentials', () => {
    const credentials = Buffer.from('admin:wrongpassword').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    try {
      guard.canActivate(mockExecutionContext);
    } catch (e) {
      // expected
    }
    expect(mockResponse.setHeader).not.toHaveBeenCalled();
  });

  it('should return true with valid credentials', () => {
    const credentials = Buffer.from('admin:fablino2026').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    const result = guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });

  it('should throw UnauthorizedException with invalid username', () => {
    const credentials = Buffer.from('wronguser:fablino2026').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException with invalid password', () => {
    const credentials = Buffer.from('admin:wrongpassword').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
  });

  it('should use custom admin password from config', () => {
    (configService.get as jest.Mock).mockReturnValue('custompassword');
    
    const credentials = Buffer.from('admin:custompassword').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    const result = guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
    expect(configService.get).toHaveBeenCalledWith('ADMIN_PASSWORD');
  });

  it('should use default password when config returns null', () => {
    (configService.get as jest.Mock).mockReturnValue(null);
    
    const credentials = Buffer.from('admin:fablino2026').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    const result = guard.canActivate(mockExecutionContext);
    expect(result).toBe(true);
  });

  it('should handle malformed authorization header', () => {
    mockRequest.headers.authorization = 'Basic malformed';

    expect(() => guard.canActivate(mockExecutionContext)).toThrow();
  });

  it('should handle authorization header without Basic prefix', () => {
    const credentials = Buffer.from('admin:fablino2026').toString('base64');
    mockRequest.headers.authorization = credentials; // Missing "Basic " prefix

    expect(() => guard.canActivate(mockExecutionContext)).toThrow();
  });

  it('should handle credentials without colon separator', () => {
    const credentials = Buffer.from('adminpassword').toString('base64'); // No colon
    mockRequest.headers.authorization = `Basic ${credentials}`;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
  });

  it('should handle empty credentials', () => {
    const credentials = Buffer.from('').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
  });

  it('should handle credentials with only username', () => {
    const credentials = Buffer.from('admin:').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
  });

  it('should handle credentials with only password', () => {
    const credentials = Buffer.from(':fablino2026').toString('base64');
    mockRequest.headers.authorization = `Basic ${credentials}`;

    expect(() => guard.canActivate(mockExecutionContext)).toThrow(UnauthorizedException);
  });
});
