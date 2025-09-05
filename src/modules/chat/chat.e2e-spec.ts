import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import ioClient from 'socket.io-client';
import * as request from 'supertest';
import { AppModule } from '../../app.module';
import { PrismaService } from '../../database/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { MessageRole, SessionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import cookieParser from 'cookie-parser';

describe('Chat Module (E2E)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let clientSocket: any;
  let serverPort: number;

  let testUser: any;
  let testSession: any;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);

    await app.init();
    await app.listen(0);
    serverPort = app.getHttpServer().address().port;

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: `e2e-${Date.now()}@example.com`,
        name: 'Test User',
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
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }

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

  afterEach(() => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Complete Chat Flow', () => {
    it('should handle complete chat workflow via WebSocket', (done) => {
      let connectionEstablished = false;
      let sessionJoined = false;
      let messageReceived = false;

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: authToken,
        },
      });

      // Step 1: Establish connection
      clientSocket.on('connected', (data) => {
        expect(data.type).toBe('system');
        expect(data.data.userId).toBe(testUser.id);
        connectionEstablished = true;

        // Step 2: Join session
        clientSocket.emit('join_session', { sessionId: testSession.id });
      });

      // Step 3: Handle session join
      clientSocket.on('session_joined', (data) => {
        expect(connectionEstablished).toBe(true);
        expect(data.type).toBe('system');
        expect(data.data.sessionId).toBe(testSession.id);
        sessionJoined = true;

        // Step 4: Send message
        clientSocket.emit('send_message', {
          content: 'Hello from WebSocket!',
          metadata: { source: 'e2e-test' },
        });
      });

      // Step 5: Receive message broadcast
      clientSocket.on('message_received', (data) => {
        expect(sessionJoined).toBe(true);
        expect(data.type).toBe('message');
        expect(data.data.content).toBe('Hello from WebSocket!');
        expect(data.data.role).toBe(MessageRole.USER);
        expect(data.data.sessionId).toBe(testSession.id);
        expect(data.data.metadata.source).toBe('e2e-test');
        messageReceived = true;

        // Step 6: Get session info
        clientSocket.emit('get_session_info');
      });

      // Step 7: Verify session info
      clientSocket.on('session_info', (data) => {
        expect(messageReceived).toBe(true);
        expect(data.type).toBe('system');
        expect(data.data.connected).toBe(true);
        expect(data.data.sessionId).toBe(testSession.id);
        expect(data.data.messageCount).toBe(1);

        done();
      });

      clientSocket.on('error', (error) => {
        done(error);
      });

      clientSocket.on('connect_error', (error) => {
        done(error);
      });
    });

    it('should handle typing indicators', (done) => {
      let sessionJoined = false;

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: authToken,
        },
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: testSession.id });
      });

      clientSocket.on('session_joined', () => {
        sessionJoined = true;

        // Send typing indicator
        clientSocket.emit('typing', { isTyping: true });

        // Since we only have one client, we won't receive our own typing indicator
        // In a real scenario with multiple clients, others would receive it
        setTimeout(() => {
          expect(sessionJoined).toBe(true);
          done();
        }, 100);
      });

      clientSocket.on('error', (error) => {
        done(error);
      });
    });

    it('should handle session leave', (done) => {
      let sessionJoined = false;

      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: authToken,
        },
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', { sessionId: testSession.id });
      });

      clientSocket.on('session_joined', () => {
        sessionJoined = true;
        clientSocket.emit('leave_session');
      });

      clientSocket.on('session_left', (data) => {
        expect(sessionJoined).toBe(true);
        expect(data.type).toBe('system');
        expect(data.data.sessionId).toBe(testSession.id);
        done();
      });

      clientSocket.on('error', (error) => {
        done(error);
      });
    });
  });

  describe('HTTP API Integration', () => {
    it('should send message via HTTP API', async () => {
      const response = await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({
          content: 'Hello from HTTP API!',
          metadata: { source: 'http-api' },
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello from HTTP API!');
      expect(response.body.data.role).toBe(MessageRole.USER);
      expect(response.body.data.sessionId).toBe(testSession.id);
    });

    it('should retrieve messages via HTTP API', async () => {
      // First create a message
      await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .send({
          content: 'Test message for retrieval',
        });

      // Then retrieve messages
      const response = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);

      const message = response.body.data.find(
        (msg: any) => msg.content === 'Test message for retrieval',
      );
      expect(message).toBeDefined();
    });

    it('should get message count via HTTP API', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/count`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.count).toBeGreaterThan(0);
    });

    it('should get recent messages via HTTP API', async () => {
      const response = await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages/recent?limit=5`)
        .set('Cookie', `jwt=${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should require authentication for HTTP endpoints', async () => {
      await request(app.getHttpServer())
        .post(`/chat/sessions/${testSession.id}/messages`)
        .send({
          content: 'Unauthorized message',
        })
        .expect(401);

      await request(app.getHttpServer())
        .get(`/chat/sessions/${testSession.id}/messages`)
        .expect(401);
    });
  });

  describe('Error Handling', () => {
    it('should reject WebSocket connections without authentication', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}/chat`);

      clientSocket.on('connect', () => {
        done(new Error('Should not connect without authentication'));
      });

      clientSocket.on('disconnect', (reason) => {
        expect(['server disconnect', 'io server disconnect']).toContain(reason);
        done();
      });
    });

    it('should reject joining non-existent sessions', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: authToken,
        },
      });

      clientSocket.on('connected', () => {
        clientSocket.emit('join_session', {
          sessionId: 'non-existent-session',
        });
      });

      clientSocket.on('error', (data) => {
        expect(data.type).toBe('error');
        expect(data.data.message).toBe('Session not found or expired');
        done();
      });
    });

    it('should reject messages when not in a session', (done) => {
      clientSocket = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: {
          token: authToken,
        },
      });

      clientSocket.on('connected', () => {
        // Try to send message without joining session
        clientSocket.emit('send_message', {
          content: 'This should fail',
        });
      });

      clientSocket.on('error', (data) => {
        expect(data.type).toBe('error');
        expect(data.data.message).toBe('Not connected to a session');
        done();
      });
    });
  });

  describe('Multi-Client Scenarios', () => {
    it('should broadcast messages to multiple clients in same session', (done) => {
      let client1Connected = false;
      let client2Connected = false;
      let client1JoinedSession = false;
      let client2JoinedSession = false;
      let messagesSent = 0;
      let messagesReceived = 0;

      const client1 = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: { token: authToken },
      });

      const client2 = ioClient(`http://localhost:${serverPort}/chat`, {
        auth: { token: authToken },
      });

      // Client 1 setup
      client1.on('connected', () => {
        client1Connected = true;
        client1.emit('join_session', { sessionId: testSession.id });
      });

      client1.on('session_joined', () => {
        client1JoinedSession = true;
        checkReadyAndSendMessage();
      });

      client1.on('message_received', (data) => {
        messagesReceived++;
        expect(data.data.content).toBe('Multi-client test message');
        checkComplete();
      });

      // Client 2 setup
      client2.on('connected', () => {
        client2Connected = true;
        client2.emit('join_session', { sessionId: testSession.id });
      });

      client2.on('session_joined', () => {
        client2JoinedSession = true;
        checkReadyAndSendMessage();
      });

      client2.on('message_received', (data) => {
        messagesReceived++;
        expect(data.data.content).toBe('Multi-client test message');
        checkComplete();
      });

      function checkReadyAndSendMessage() {
        if (
          client1JoinedSession &&
          client2JoinedSession &&
          messagesSent === 0
        ) {
          messagesSent++;
          client1.emit('send_message', {
            content: 'Multi-client test message',
          });
        }
      }

      function checkComplete() {
        if (messagesReceived === 2) {
          // Both clients should receive the message
          client1.disconnect();
          client2.disconnect();
          done();
        }
      }

      // Handle errors
      client1.on('error', done);
      client2.on('error', done);
    });
  });
});
