# Database Setup Guide

This guide covers the database setup for the P0 Backend recruitment agent platform.

## Prerequisites

- PostgreSQL server running locally or accessible via connection string
- Node.js >=20.0.0 and npm >=10.0.0 installed
- Environment variables configured in `.env` file

## Database Configuration

### Environment Variables

Ensure your `.env` file contains the following database configuration:

```env
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/recruitment_agent?schema=public"
```

Replace `username`, `password`, `localhost:5432`, and `recruitment_agent` with your actual database credentials and connection details.

## Database Schema

The P0 Backend uses the following core models:

### User Model
- **Purpose**: Store user accounts and preferences
- **Key Fields**: id, email, name, preferences (JSON), timestamps
- **Relationships**: One-to-many with Sessions

### Session Model  
- **Purpose**: Manage chat sessions and conversation state
- **Key Fields**: id, userId, status, context (JSON), expiration
- **Relationships**: Belongs to User, one-to-many with ConversationMessages

### ConversationMessage Model
- **Purpose**: Store individual messages in conversations
- **Key Fields**: id, sessionId, role (USER/ASSISTANT/SYSTEM), content, metadata (JSON)
- **Relationships**: Belongs to Session
- **Indexes**: Optimized for sessionId + timestamp queries

### Enums
- **SessionStatus**: ACTIVE, INACTIVE, EXPIRED
- **MessageRole**: USER, ASSISTANT, SYSTEM

## Setup Instructions

### Option 1: Automated Setup (Recommended)

Run the automated setup script:

```bash
# Make sure your database server is running first
./scripts/setup-database.sh
```

This script will:
1. Generate the Prisma client
2. Run database migrations
3. Seed development data
4. Provide next steps

### Option 2: Manual Setup

1. **Generate Prisma Client**
   ```bash
   npm run prisma:generate
   ```

2. **Run Initial Migration**
   ```bash
   npm run prisma:migrate -- --name init
   ```

3. **Seed Development Data**
   ```bash
   npm run prisma:seed
   ```

## Development Data

The seed script creates:

### Test Users
- **recruiter@example.com**: Sample recruiter with professional preferences
- **admin@example.com**: Admin user with casual communication style

### Sample Sessions
- Active session with role requirements for "Senior Full Stack Developer"
- Inactive session for "DevOps Engineer" role

### Conversation Messages
- Realistic conversation flow between recruiter and AI assistant
- Includes metadata like token counts, processing times, and extracted requirements

## Available Scripts

```bash
# Generate Prisma client (run after schema changes)
npm run prisma:generate

# Create and apply new migration
npm run prisma:migrate -- --name <migration_name>

# Deploy migrations (production)
npm run prisma:migrate:deploy

# Reset database (development only)
npm run prisma:migrate:reset

# Seed database with development data
npm run prisma:seed

# Open Prisma Studio (database GUI)
npm run prisma:studio
```

## Database Management

### Viewing Data
Use Prisma Studio for a visual interface:
```bash
npm run prisma:studio
```

### Creating Migrations
When you modify the schema in `prisma/schema.prisma`:
```bash
npm run prisma:migrate -- --name describe_your_changes
```

### Resetting Database (Development)
To start fresh with a clean database:
```bash
npm run prisma:migrate:reset
```

## Production Deployment

For production environments:

1. **Set Production DATABASE_URL**
2. **Deploy Migrations**
   ```bash
   npm run prisma:migrate:deploy
   ```
3. **Generate Client**
   ```bash
   npm run prisma:generate
   ```

**Note**: Never run `prisma:migrate:reset` or `prisma:seed` in production.

## Troubleshooting

### Connection Issues
- Verify DATABASE_URL format and credentials
- Ensure PostgreSQL server is running
- Check firewall and network connectivity

### Migration Errors
- Review migration files in `prisma/migrations/`
- Check for schema conflicts or data constraints
- Use `prisma migrate resolve` for failed migrations

### Performance
- Monitor query performance with Prisma's built-in logging
- Add database indexes for frequently queried fields
- Use `include` and `select` to optimize data fetching

## Schema Evolution

The current schema supports P0 requirements. Future phases will add:

- **P1**: Role requirements, search history, user memory models
- **P2**: Advanced analytics, performance metrics, audit logs

All schema changes will be managed through Prisma migrations to ensure data integrity and smooth deployments.