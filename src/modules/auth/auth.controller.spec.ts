import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';
import { User } from '@prisma/client';

describe('AuthController (Integration)', () => {
  let app: INestApplication;
  let authRepository: AuthRepository;
  let prismaService: PrismaService;
  let testUser: User;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              JWT_SECRET: 'test-jwt-secret',
              JWT_EXPIRES_IN: '7d',
            }),
          ],
        }),
        PassportModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (configService: ConfigService) => ({
            secret: configService.get('JWT_SECRET'),
            signOptions: {
              expiresIn: configService.get('JWT_EXPIRES_IN', '7d'),
            },
          }),
          inject: [ConfigService],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        AuthRepository,
        JwtStrategy,
        JwtAuthGuard,
        PrismaService,
        {
          provide: APP_FILTER,
          useClass: GlobalExceptionFilter,
        },
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply middleware
    app.use(cookieParser());

    // Apply global pipes and filters
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await authRepository.createUser({
      email: 'test@example.com',
      name: 'Test User',
      password: hashedPassword,
      preferences: {},
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prismaService.user.deleteMany({
      where: {
        email: {
          in: ['test@example.com', 'newuser@example.com'],
        },
      },
    });
    await app.close();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials and set JWT cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('test@example.com');
      expect(response.body.data.name).toBe('Test User');
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.message).toBe('Login successful');

      // Check JWT cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(
        /jwt=.+; Max-Age=604800; Path=\/; .+HttpOnly.+SameSite=Strict/,
      );
    });

    it('should fail with invalid email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe('Invalid credentials');
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/register', () => {
    it('should register new user successfully and set JWT cookie', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'password123',
          preferences: {
            communicationStyle: 'casual',
          },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.name).toBe('New User');
      expect(response.body.data.password).toBeUndefined();
      expect(response.body.message).toBe('Registration successful');

      // Check JWT cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(
        /jwt=.+; Max-Age=604800; Path=\/; .+HttpOnly.+SameSite=Strict/,
      );

      // Verify user was created in database
      const createdUser = await authRepository.findUserByEmail(
        'newuser@example.com',
      );
      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('New User');
    });

    it('should fail when registering with existing email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'test@example.com', // Already exists
          name: 'Another User',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toBe(
        'User already exists with this email',
      );
    });

    it('should fail with short password', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: '123', // Too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid email format', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'invalid-email',
          name: 'New User',
          password: 'password123',
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /auth/profile', () => {
    it('should get user profile with valid JWT cookie', async () => {
      // First login to get JWT cookie
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Use JWT cookie to access profile
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Cookie', cookies)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe('test@example.com');
      expect(profileResponse.body.data.password).toBeUndefined();
      expect(profileResponse.body.message).toBe(
        'Profile retrieved successfully',
      );
    });

    it('should get user profile with valid JWT header', async () => {
      // First login to get JWT token (we'll extract it from cookie for this test)
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      // Extract JWT from cookie
      const cookies = loginResponse.headers['set-cookie'];
      const jwtCookie = cookies[0];
      const token = jwtCookie.split('jwt=')[1].split(';')[0];

      // Use JWT in Authorization header
      const profileResponse = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.email).toBe('test@example.com');
    });

    it('should fail without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should fail with invalid JWT token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully and clear JWT cookie', async () => {
      // First login to get JWT cookie
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];

      // Logout
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);
      expect(logoutResponse.body.message).toBe('Logout successful');

      // Check that JWT cookie is cleared
      const clearCookies = logoutResponse.headers['set-cookie'];
      expect(clearCookies).toBeDefined();
      expect(clearCookies[0]).toMatch(/jwt=; Path=\/; Expires=/);
    });

    it('should fail logout without authentication', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Complete Authentication Flow', () => {
    it('should complete full registration -> login -> profile -> logout flow', async () => {
      // 1. Register new user
      const uniqueEmail = `flowtest-${Date.now()}@example.com`;
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          name: 'Flow Test User',
          password: 'password123',
        })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const registerCookies = registerResponse.headers['set-cookie'];

      // 2. Access profile with registration JWT
      const profileResponse1 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Cookie', registerCookies)
        .expect(200);

      expect(profileResponse1.body.data.email).toBe(uniqueEmail);

      // 3. Logout
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', registerCookies)
        .expect(200);

      // 4. Login again
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: uniqueEmail,
          password: 'password123',
        })
        .expect(200);

      const loginCookies = loginResponse.headers['set-cookie'];

      // 5. Access profile with login JWT
      const profileResponse2 = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Cookie', loginCookies)
        .expect(200);

      expect(profileResponse2.body.data.email).toBe(uniqueEmail);

      // Cleanup
      await prismaService.user.delete({
        where: { email: uniqueEmail },
      });
    });
  });
});
