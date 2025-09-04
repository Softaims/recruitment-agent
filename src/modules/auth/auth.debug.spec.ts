import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import request from 'supertest';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import { User } from '@prisma/client';

describe('Auth Debug', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let authRepository: AuthRepository;
  let prismaService: PrismaService;
  let testUser: User;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({
            JWT_SECRET: 'test-jwt-secret',
            JWT_EXPIRES_IN: '7d',
          })],
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
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Apply middleware
    app.use(cookieParser());
    
    jwtService = moduleFixture.get<JwtService>(JwtService);
    authRepository = moduleFixture.get<AuthRepository>(AuthRepository);
    prismaService = moduleFixture.get<PrismaService>(PrismaService);

    await app.init();

    // Create test user
    const hashedPassword = await bcrypt.hash('password123', 10);
    testUser = await authRepository.createUser({
      email: 'debug@example.com',
      name: 'Debug User',
      password: hashedPassword,
      preferences: {},
    });
  });

  afterEach(async () => {
    await prismaService.user.deleteMany({
      where: { email: 'debug@example.com' },
    });
    await app.close();
  });

  it('should debug JWT token creation and validation', async () => {
    // Test JWT service directly
    const payload = { sub: testUser.id, email: testUser.email };
    const token = jwtService.sign(payload);
    console.log('Generated token:', token);

    // Verify token
    const decoded = jwtService.verify(token);
    console.log('Decoded token:', decoded);

    expect(decoded.sub).toBe(testUser.id);
    expect(decoded.email).toBe(testUser.email);

    // Test login endpoint
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'debug@example.com',
        password: 'password123',
      })
      .expect(200);

    console.log('Login response cookies:', loginResponse.headers['set-cookie']);

    // Extract JWT from cookie
    const cookies = loginResponse.headers['set-cookie'];
    const jwtCookie = cookies[0];
    const cookieToken = jwtCookie.split('jwt=')[1].split(';')[0];
    console.log('Cookie token:', cookieToken);

    // Verify cookie token
    const cookieDecoded = jwtService.verify(cookieToken);
    console.log('Cookie decoded:', cookieDecoded);

    // Test profile endpoint with Authorization header first
    const headerResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${cookieToken}`)
      .expect((res) => {
        console.log('Header response status:', res.status);
        console.log('Header response body:', res.body);
      });

    // Test profile endpoint with cookie
    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Cookie', cookies)
      .expect((res) => {
        console.log('Profile response status:', res.status);
        console.log('Profile response body:', res.body);
      });
  });
});