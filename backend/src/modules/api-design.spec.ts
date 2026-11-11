import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PaginationQueryDto } from './performance/performance.dto';
import { LoginDto } from './auth/login.dto';
import { PUBLIC_ROUTE, REQUIRED_PERMISSION } from '../common/authz';

@Controller('test-api')
class TestApiController {
  @Post('orders')
  createOrder(@Body() dto: PaginationQueryDto) {
    return { success: true, data: dto };
  }

  @Get('orders')
  getOrders(@Query() query: PaginationQueryDto) {
    return { success: true, data: [], meta: query };
  }
}

describe('API Design Standard Verification (#70)', () => {
  const backendSrcPath = path.resolve(__dirname, '../');

  describe('1. Promptdoc #70 Core REST Endpoints & Resources', () => {
    it('should have standard REST controllers covering all required ERP functional areas', () => {
      const requiredControllers = [
        'auth/auth.controller.ts',
        'users/users.controller.ts',
        'gate/gate.controller.ts',
        'procurement/procurement.controller.ts',
        'inventory/inventory.controller.ts',
        'production/production.controller.ts',
        'sales/sales.controller.ts',
        'dispatch/dispatch.controller.ts',
        'accounting/accounting.controller.ts',
        'reports/reports.controller.ts',
        'profitability/profitability.controller.ts',
        'mobile/mobile.controller.ts',
        'backup/backup.controller.ts',
      ];

      for (const ctrl of requiredControllers) {
        const fullPath = path.join(backendSrcPath, 'modules', ctrl);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });

    it('should verify main.ts configures global prefix, CORS, helmet, and validation pipe', () => {
      const mainPath = path.join(backendSrcPath, 'main.ts');
      const mainContent = fs.readFileSync(mainPath, 'utf8');

      expect(mainContent).toContain("app.setGlobalPrefix('api/v1')");
      expect(mainContent).toContain('app.use(helmet())');
      expect(mainContent).toContain('app.enableCors(');
      expect(mainContent).toContain('new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })');
    });
  });

  describe('2. DTO Validation & Transformation', () => {
    it('should reject invalid pagination input and enforce limits', async () => {
      const invalidQuery = plainToInstance(PaginationQueryDto, {
        page: -5,
        limit: 500, // exceeds max 100
      });
      const errors = await validate(invalidQuery);
      expect(errors.length).toBeGreaterThan(0);
      const constraints = errors.map(e => Object.keys(e.constraints || {})).flat();
      expect(constraints).toEqual(expect.arrayContaining(['min', 'max']));
    });

    it('should accept valid pagination parameters', async () => {
      const validQuery = plainToInstance(PaginationQueryDto, {
        page: 2,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      const errors = await validate(validQuery);
      expect(errors.length).toBe(0);
    });

    it('should reject invalid auth login DTO without valid email', async () => {
      const invalidLogin = plainToInstance(LoginDto, {
        email: 'invalid-email-format',
        password: '',
      });
      const errors = await validate(invalidLogin as object);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('3. Authentication & RBAC Metadata Architecture', () => {
    it('should correctly define authorization metadata tokens', () => {
      expect(PUBLIC_ROUTE).toBe('public-route');
      expect(REQUIRED_PERMISSION).toBe('required-permission');
    });

    it('should verify controllers enforce company/factory multi-tenant isolation and permission checks', () => {
      const gateControllerPath = path.join(backendSrcPath, 'modules/gate/gate.controller.ts');
      const content = fs.readFileSync(gateControllerPath, 'utf8');
      expect(content).toContain('AuthenticatedRequest');
      expect(content).toContain('RequirePermission');
      expect(content).toContain('companyId');
    });
  });

  describe('4. Swagger OpenAPI 3.0 Documentation Specification', () => {
    let appModule: TestingModule;

    beforeAll(async () => {
      appModule = await Test.createTestingModule({
        controllers: [TestApiController],
      }).compile();
    });

    it('should generate a valid OpenAPI 3.0 specification via DocumentBuilder', () => {
      const app = appModule.createNestApplication();
      const config = new DocumentBuilder()
        .setTitle('Rice Mill ERP API')
        .setDescription('REST API for Rice Mill ERP Enterprise Platform')
        .setVersion('1.0')
        .addBearerAuth()
        .build();

      const document = SwaggerModule.createDocument(app, config);
      expect(document.openapi).toMatch(/^3\./);
      expect(document.info.title).toBe('Rice Mill ERP API');
      expect(document.info.version).toBe('1.0');
      expect(document.paths['/test-api/orders']).toBeDefined();
      expect(document.paths['/test-api/orders'].post).toBeDefined();
      expect(document.paths['/test-api/orders'].get).toBeDefined();
    });
  });
});
