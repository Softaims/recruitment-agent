import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { SessionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

describe('Sessions Module Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let testUser: { id: string; email: string };
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test user
    const created = await prisma.user.create({
      data: {
        email: `sessions-int-${Date.now()}@example.com`,
        name: 'Sessions Test User',
        password: await bcrypt.hash('password123', 10),
      },
      select: { id: true, email: true },
    });
    testUser = created;

    // Generate JWT
    authToken = jwtService.sign({ sub: testUser.id, email: testUser.email });
  });

  afterAll(async () => {
    // Cleanup any sessions and user
    await prisma.session.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });
    await app.close();
  });

  describe('HTTP endpoints', () => {
    let sessionId: string;

    it('creates a session', async () => {
      const res = await request(app.getHttpServer())
        .post('/sessions')
        .set('Cookie', `jwt=${authToken}`)
        .send({ context: { purpose: 'testing' } })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SessionStatus.ACTIVE);
      expect(res.body.data.userId).toBe(testUser.id);
      expect(new Date(res.body.data.expiresAt).getTime()).toBeGreaterThan(
        Date.now(),
      );
      expect(res.body.data.context).toEqual({ purpose: 'testing' });
      sessionId = res.body.data.id;
    });

    it('lists user sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/sessions')
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.find((s: any) => s.id === sessionId)).toBeTruthy();
    });

    it('lists active sessions', async () => {
      const res = await request(app.getHttpServer())
        .get('/sessions/active')
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.some((s: any) => s.status === 'ACTIVE')).toBe(true);
    });

    it('gets a session by id', async () => {
      const res = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(sessionId);
      expect(res.body.data.userId).toBe(testUser.id);
    });

    it('updates session context', async () => {
      const res = await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/context`)
        .set('Cookie', `jwt=${authToken}`)
        .send({ context: { updated: true, foo: 'bar' } })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.context).toEqual({ updated: true, foo: 'bar' });
    });

    it('bumps last activity', async () => {
      // Get current lastActivity
      const before = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .set('Cookie', `jwt=${authToken}`);
      const beforeTs = new Date(before.body.data.lastActivity).getTime();

      // Update activity
      const res = await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/activity`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      const afterTs = new Date(res.body.data.lastActivity).getTime();
      expect(afterTs).toBeGreaterThanOrEqual(beforeTs);
    });

    it('expires a session and then get returns error', async () => {
      await request(app.getHttpServer())
        .put(`/sessions/${sessionId}/expire`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/sessions/${sessionId}`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('requires authentication', async () => {
      await request(app.getHttpServer()).post('/sessions').expect(401);
      await request(app.getHttpServer()).get('/sessions').expect(401);
      await request(app.getHttpServer()).get('/sessions/active').expect(401);
    });
  });
});
