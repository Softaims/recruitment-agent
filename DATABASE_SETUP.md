# P0 Backend Database Setup

This document provides a quick reference for setting up the database for the P0 Backend recruitment agent.

## Quick Start

1. **Ensure PostgreSQL is running** and accessible via your `DATABASE_URL` in `.env`

2. **Run the automated setup:**
   ```bash
   npm run db:setup
   ```

3. **Validate the setup:**
   ```bash
   npm run db:validate
   ```

4. **Optional: Open Prisma Studio to view data:**
   ```bash
   npm run prisma:studio
   ```

## What Gets Created

### Database Schema
- **Users table**: User accounts with preferences (JSON)
- **Sessions table**: Chat sessions with context and expiration
- **ConversationMessages table**: Individual messages with metadata
- **Enums**: SessionStatus (ACTIVE/INACTIVE/EXPIRED), MessageRole (USER/ASSISTANT/SYSTEM)

### Development Data
- 2 test users (recruiter@example.com, admin@example.com)
- 2 sample sessions with different statuses
- 6 realistic conversation messages with metadata

### Indexes and Relationships
- Proper foreign key relationships with cascade deletes
- Optimized indexes for session + timestamp queries
- JSON fields for flexible metadata and preferences

## Available Commands

```bash
# Complete database setup (recommended)
npm run db:setup

# Reset database and reseed (development only)
npm run db:reset

# Validate database setup
npm run db:validate

# Individual Prisma commands
npm run prisma:generate     # Generate client
npm run prisma:migrate      # Create/apply migrations  
npm run prisma:seed         # Seed development data
npm run prisma:studio       # Open database GUI
```

## Requirements Satisfied

This setup satisfies the following requirements from the P0 Backend spec:

- **Requirement 7.1**: PostgreSQL for structured data storage with Prisma ORM
- **Requirement 7.2**: Proper session caching structure (ready for Redis integration)
- **Requirement 9.2**: Environment configuration with DATABASE_URL validation

## Next Steps

After database setup, you can:

1. **Start the development server**: `npm run start:dev`
2. **Run tests**: `npm run test`
3. **Begin implementing repositories and services** (Task 3.1)

For detailed information, see [docs/Database_Setup.md](docs/Database_Setup.md).