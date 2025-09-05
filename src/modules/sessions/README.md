# Sessions Module

The Sessions module provides comprehensive session management with Redis caching, automatic cleanup, and business logic for handling user sessions in the recruitment agent platform.

## Architecture

This module follows the three-layer architecture:

- **SessionsController**: Route handling, validation, and response shaping
- **SessionsService**: Business logic for session management
- **SessionRepository**: All Prisma/database operations

## Features

### Core Session Management
- Create new sessions with configurable expiration
- Retrieve sessions with user information
- Update session context and activity
- Automatic session expiration handling
- Session cleanup and deletion

### Redis Caching
- Automatic caching of session data for performance
- Cache invalidation on updates and expiration
- Fallback to database when cache misses

### Automatic Cleanup
- Scheduled cleanup of expired sessions (hourly)
- Deletion of old expired sessions (daily at 2 AM)
- Configurable cleanup intervals

### Session Limits
- Configurable maximum active sessions per user
- Automatic expiration of oldest sessions when limit reached

## Configuration

Add these environment variables to configure session behavior:

```env
# Session Configuration
SESSION_DEFAULT_EXPIRATION_HOURS=24
SESSION_CACHE_EXPIRATION_SECONDS=3600
SESSION_MAX_ACTIVE_SESSIONS=10
SESSION_CLEANUP_INTERVAL_MINUTES=60
```

## API Endpoints

### Create Session
```http
POST /sessions
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "context": {},
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

### Get User Sessions
```http
GET /sessions?skip=0&take=50
Authorization: Bearer <jwt-token>
```

### Get Active Sessions
```http
GET /sessions/active
Authorization: Bearer <jwt-token>
```

### Get Session by ID
```http
GET /sessions/:id
Authorization: Bearer <jwt-token>
```

### Get Session with Messages
```http
GET /sessions/:id/messages
Authorization: Bearer <jwt-token>
```

### Update Session
```http
PUT /sessions/:id
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "context": {},
  "status": "ACTIVE",
  "expiresAt": "2024-01-01T00:00:00Z"
}
```

### Update Session Activity
```http
PUT /sessions/:id/activity
Authorization: Bearer <jwt-token>
```

### Update Session Context
```http
PUT /sessions/:id/context
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "context": {
    "currentStep": "requirements_gathering",
    "preferences": {}
  }
}
```

### Expire Session
```http
PUT /sessions/:id/expire
Authorization: Bearer <jwt-token>
```

### Delete Session
```http
DELETE /sessions/:id
Authorization: Bearer <jwt-token>
```

## Usage Examples

### Creating a Session
```typescript
import { SessionsService } from './sessions.service';

// Create a basic session
const session = await sessionsService.createSession(userId);

// Create a session with custom context and expiration
const customSession = await sessionsService.createSession(userId, {
  context: { step: 'onboarding' },
  expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours
});
```

### Retrieving Sessions
```typescript
// Get a specific session
const session = await sessionsService.getSession(sessionId);

// Get session with conversation messages
const sessionWithMessages = await sessionsService.getSessionWithMessages(sessionId);

// Get all user sessions
const userSessions = await sessionsService.getUserSessions(userId);

// Get only active sessions
const activeSessions = await sessionsService.getActiveSessions(userId);
```

### Updating Sessions
```typescript
// Update session context
await sessionsService.updateSessionContext(sessionId, {
  currentRole: 'Software Engineer',
  requirements: ['React', 'Node.js']
});

// Update last activity (extends session life)
await sessionsService.updateSessionActivity(sessionId);

// Update session properties
await sessionsService.updateSession(sessionId, {
  status: 'INACTIVE',
  context: { paused: true }
});
```

### Session Cleanup
```typescript
// Manual cleanup of expired sessions
const expiredCount = await sessionsService.cleanupExpiredSessions();

// Delete old expired sessions (older than 30 days)
const deletedCount = await sessionsService.deleteOldExpiredSessions(30);
```

## Types and DTOs

### CreateSessionDto
```typescript
{
  context?: any;
  expiresAt?: Date;
}
```

### UpdateSessionDto
```typescript
{
  context?: any;
  status?: SessionStatus;
  expiresAt?: Date;
}
```

### SessionWithUser
```typescript
{
  id: string;
  userId: string;
  status: SessionStatus;
  context: any;
  createdAt: Date;
  lastActivity: Date;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string;
  };
}
```

### SessionWithMessages
```typescript
{
  // ... SessionWithUser properties
  messages: ConversationMessage[];
}
```

## Scheduled Tasks

The module includes automatic cleanup tasks:

- **Hourly**: Mark expired sessions as expired and remove from cache
- **Daily (2 AM)**: Delete old expired sessions from database

These tasks are handled by the `SessionsScheduler` service.

## Testing

Run the session service tests:

```bash
npm run test -- src/modules/sessions/sessions.service.spec.ts
```

The test suite covers:
- Session creation and limits
- Session retrieval and caching
- Session expiration handling
- Activity updates
- Cleanup operations

## Integration

To use the sessions module in your application:

1. Import the `SessionsModule` in your app module
2. Inject `SessionsService` where needed
3. Use the provided DTOs for type safety
4. Configure environment variables for customization

```typescript
import { SessionsModule } from './modules/sessions';

@Module({
  imports: [SessionsModule],
  // ...
})
export class AppModule {}
```