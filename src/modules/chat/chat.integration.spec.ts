import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MessageRole, SessionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('Chat Module Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  let testUser: any;
  let testSession: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'chat-test@example.com',
        name: 'Chat Test User',
        password: await bcrypt.hash('password123', 10),
      },
    });

    // Generate auth token
    authToken = jwtService.sign({
      sub: testUser.id,
      email: testUser.email,
    });

    // Create test session
    testSession = await prisma.session.create({
      data: {
        userId: testUser.id,
        status: SessionStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.conversationMessage.deleteMany({
      where: { sessionId: testSession.id },
    });
    await prisma.session.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });

    await app.close();
  });

  describe('Complete Chat Workflow', () => {
    let messageId: string;

    it('should send a message via HTTP API', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({
          content: 'Hello from integration test!',
          metadata: { source: 'integration-test', priority: 'high' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello from integration test!');
      expect(response.body.data.role).toBe(MessageRole.USER);
      expect(response.body.data.sessionId).toBe(testSession.id);
      expect(response.body.data.metadata.source).toBe('integration-test');
      expect(response.body.data.metadata.priority).toBe('high');
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.timestamp).toBeDefined();

      messageId = response.body.data.id;
    });

    it('should retrieve messages from the session', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(1);

      const message = response.body.data[0];
      expect(message.id).toBe(messageId);
      expect(message.content).toBe('Hello from integration test!');
      expect(message.role).toBe(MessageRole.USER);
    });

    it('should get recent messages', async () => {
      // Send another message
      await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({
          content: 'Second message',
          metadata: { order: 2 },
        });

      const response = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/recent?limit=5`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBe(2);

      // Recent messages should be in reverse chronological order
      expect(response.body.data[0].content).toBe('Second message');
      expect(response.body.data[1].content).toBe(
        'Hello from integration test!',
      );
    });

    it('should get message count', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/count`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBe(2);
    });

    it('should retrieve a specific message', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chat/messages/${messageId}`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(messageId);
      expect(response.body.data.content).toBe('Hello from integration test!');
      expect(response.body.data.metadata.source).toBe('integration-test');
    });

    it('should update a message', async () => {
      const response = await request(app.getHttpServer())
        .put(`/chat/messages/${messageId}`)
        .set('Cookie', `jwt=${authToken}`)
        .send({
          content: 'Updated message content',
          metadata: {
            source: 'integration-test',
            edited: true,
            priority: 'medium',
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Updated message content');
      expect(response.body.data.metadata.edited).toBe(true);
      expect(response.body.data.metadata.priority).toBe('medium');
    });

    it('should delete a message', async () => {
      // Create a message to delete
      const createResponse = await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({
          content: 'Message to delete',
        });

      const messageToDeleteId = createResponse.body.data.id;

      // Delete the message
      const deleteResponse = await request(app.getHttpServer())
        .delete(`/chat/messages/${messageToDeleteId}`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.data).toBeNull();

      // Verify message is deleted
      await request(app.getHttpServer())
        .get(`/chat/messages/${messageToDeleteId}`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(404);
    });

    it('should clear conversation', async () => {
      // Verify we have messages
      const beforeResponse = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/count`)
        .set('Cookie', `jwt=${authToken}`);

      expect(beforeResponse.body.data.count).toBeGreaterThan(0);

      // Clear conversation
      const clearResponse = await request(app.getHttpServer())
        .delete(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(clearResponse.body.success).toBe(true);
      expect(clearResponse.body.data.deletedCount).toBeGreaterThan(0);

      // Verify messages are cleared
      const afterResponse = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/count`)
        .set('Cookie', `jwt=${authToken}`);

      expect(afterResponse.body.data.count).toBe(0);
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      // Test all endpoints without authentication
      await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .send({ content: 'Unauthorized message' })
        .expect(401);

      await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/recent`)
        .expect(401);

      await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/count`)
        .expect(401);

      await request(app.getHttpServer())
        .delete(`/chat/sessions/${testSession.id}/messages`)
        .expect(401);
    });

    it('should support JWT authentication via Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          content: 'Message via Bearer token',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Message via Bearer token');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session IDs', async () => {
      await request(app.getHttpServer())
        .post('/chat/sessions/invalid-session-id/messages')
        .set('Cookie', `jwt=${authToken}`)
        .send({ content: 'Test message' })
        .expect(404);
    });

    it('should handle invalid message IDs', async () => {
      await request(app.getHttpServer())
        .get('/chat/messages/invalid-message-id')
        .set('Cookie', `jwt=${authToken}`)
        .expect(404);

      await request(app.getHttpServer())
        .put('/chat/messages/invalid-message-id')
        .set('Cookie', `jwt=${authToken}`)
        .send({ content: 'Updated content' })
        .expect(404);

      await request(app.getHttpServer())
        .delete('/chat/messages/invalid-message-id')
        .set('Cookie', `jwt=${authToken}`)
        .expect(404);
    });

    it('should validate message content', async () => {
      // Empty content
      await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({ content: '' })
        .expect(400);

      // Missing content
      await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('Message Metadata', () => {
    it('should handle complex metadata objects', async () => {
      const complexMetadata = {
        source: 'api',
        priority: 'high',
        tags: ['important', 'urgent'],
        user_context: {
          location: 'office',
          device: 'desktop',
          session_duration: 1800,
        },
        attachments: [
          { type: 'image', url: 'https://example.com/image.jpg' },
          { type: 'document', url: 'https://example.com/doc.pdf' },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({
          content: 'Message with complex metadata',
          metadata: complexMetadata,
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metadata).toEqual(complexMetadata);
      expect(response.body.data.metadata.tags).toEqual(['important', 'urgent']);
      expect(response.body.data.metadata.user_context.location).toBe('office');
      expect(response.body.data.metadata.attachments).toHaveLength(2);
    });
  });
});
