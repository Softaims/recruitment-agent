# Chat Module - WebSocket Gateway

This module implements real-time chat functionality using WebSockets with NestJS, following the three-layer architecture pattern.

## Features

- **Real-time messaging** via WebSocket connections
- **Session-based conversations** with persistent message history
- **JWT authentication** supporting both cookies and headers
- **Connection management** with proper cleanup and session tracking
- **Typing indicators** for enhanced user experience
- **Message broadcasting** to all clients in a session
- **HTTP API endpoints** for message management
- **Comprehensive error handling** and validation

## Architecture

### Three-Layer Pattern

1. **Controller Layer** (`chat.controller.ts`)
   - Thin orchestration for HTTP endpoints
   - Request validation and response shaping
   - JWT authentication via `@HttpUser()` decorator

2. **Service Layer** (`chat.service.ts`)
   - Business logic for message processing
   - Session validation and activity tracking
   - Message creation, retrieval, and management

3. **Repository Layer** (`conversation.repository.ts`)
   - All Prisma/database operations
   - Type-safe queries with proper relations
   - Batch operations and optimized queries

### WebSocket Gateway (`chat.gateway.ts`)

- **Connection handling** with JWT authentication
- **Session management** (join/leave sessions)
- **Real-time messaging** with broadcasting
- **Typing indicators** for better UX
- **Error handling** with proper WebSocket error responses

## Usage

### WebSocket Connection

```javascript
// Client-side connection
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Or using cookies (automatic if JWT cookie is set)
const socket = io('http://localhost:3000/chat');
```

### WebSocket Events

#### Client → Server

```javascript
// Join a session
socket.emit('join_session', { sessionId: 'session-id' });

// Send a message
socket.emit('send_message', {
  content: 'Hello, world!',
  metadata: { source: 'web' }
});

// Send typing indicator
socket.emit('typing', { isTyping: true });

// Leave session
socket.emit('leave_session');

// Get session info
socket.emit('get_session_info');
```

#### Server → Client

```javascript
// Connection confirmed
socket.on('connected', (data) => {
  console.log('Connected:', data.data.userId);
});

// Session joined successfully
socket.on('session_joined', (data) => {
  console.log('Joined session:', data.data.sessionId);
  console.log('Recent messages:', data.data.recentMessages);
});

// New message received
socket.on('message_received', (data) => {
  console.log('New message:', data.data);
});

// Typing indicator from other users
socket.on('typing_indicator', (data) => {
  console.log('User typing:', data.data.userId, data.data.isTyping);
});

// Session information
socket.on('session_info', (data) => {
  console.log('Session info:', data.data);
});

// Error handling
socket.on('error', (data) => {
  console.error('WebSocket error:', data.data.message);
});
```

### HTTP API Endpoints

All endpoints require JWT authentication via cookies or Authorization header.

#### Send Message
```http
POST /chat/sessions/:sessionId/messages
Content-Type: application/json

{
  "content": "Hello, world!",
  "metadata": { "source": "api" }
}
```

#### Get Messages
```http
GET /chat/sessions/:sessionId/messages?limit=50&offset=0
```

#### Get Recent Messages
```http
GET /chat/sessions/:sessionId/messages/recent?limit=10
```

#### Get Message Count
```http
GET /chat/sessions/:sessionId/messages/count
```

#### Update Message
```http
PUT /chat/messages/:messageId
Content-Type: application/json

{
  "content": "Updated message content",
  "metadata": { "edited": true }
}
```

#### Delete Message
```http
DELETE /chat/messages/:messageId
```

#### Clear Conversation
```http
DELETE /chat/sessions/:sessionId/messages
```

## Data Models

### ConversationMessage
```typescript
{
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}
```

### WebSocket Message Format
```typescript
{
  type: 'message' | 'typing' | 'error' | 'system';
  data: any;
  timestamp: Date;
}
```

## Error Handling

### WebSocket Errors
- **Authentication failures**: Connection rejected
- **Invalid sessions**: Error event with descriptive message
- **Validation errors**: Error event with validation details
- **Server errors**: Graceful error responses with correlation IDs

### HTTP API Errors
- **401 Unauthorized**: Missing or invalid JWT
- **404 Not Found**: Session or message not found
- **400 Bad Request**: Invalid input data
- **500 Internal Server Error**: Server-side errors

## Testing

The module includes comprehensive tests:

- **Unit tests** for service business logic
- **Integration tests** for controller endpoints
- **WebSocket tests** for gateway functionality
- **E2E tests** for complete workflows

```bash
# Run all chat tests
npm test -- --testPathPattern=chat

# Run specific test suites
npm test -- --testPathPattern=chat.service.spec
npm test -- --testPathPattern=chat.controller.spec
npm test -- --testPathPattern=chat.gateway.spec
```

## Security Considerations

- **JWT Authentication**: Required for all connections and API calls
- **Session Validation**: Users can only access their own sessions
- **Input Validation**: All message content and metadata validated
- **Rate Limiting**: Configurable limits on message frequency
- **Connection Limits**: Maximum connections per user

## Performance Features

- **Connection Pooling**: Efficient WebSocket connection management
- **Message Caching**: Recent messages cached for quick access
- **Batch Operations**: Efficient database operations for multiple messages
- **Optimized Queries**: Proper indexing and query optimization

## Configuration

Environment variables for chat module:

```env
# WebSocket configuration
WEBSOCKET_CORS_ORIGIN=*
WEBSOCKET_NAMESPACE=/chat

# Message limits
MAX_MESSAGE_LENGTH=10000
MAX_MESSAGES_PER_SESSION=1000

# Rate limiting
MESSAGES_PER_MINUTE=60
CONNECTIONS_PER_USER=5
```

## Future Enhancements

- **Message reactions** and emoji support
- **File attachments** and media sharing
- **Message threading** for organized conversations
- **Push notifications** for offline users
- **Message encryption** for enhanced security
- **Voice messages** and audio support
- **Message search** and full-text indexing