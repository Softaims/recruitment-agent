#!/bin/bash

# Database Setup Script for P0 Backend
# This script initializes the database schema and seeds development data

set -e

echo "🚀 Setting up P0 Backend Database..."

# Load environment variables from .env if present
if [ -f ".env" ]; then
    echo "📦 Loading environment from .env"
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
        echo "❌ DATABASE_URL environment variable is not set"
        echo "Please set DATABASE_URL in your .env file"
        exit 1
fi

echo "📋 Checking Prisma configuration..."

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npm run prisma:generate

# Run database migrations
echo "🗄️  Running database migrations..."
npm run prisma:migrate -- --name init

# Seed the database with development data
echo "🌱 Seeding database with development data..."
npm run prisma:seed

echo "✅ Database setup completed successfully!"
echo ""
echo "📊 You can now:"
echo "  - View your database with: npm run prisma:studio"
echo "  - Reset database with: npm run prisma:migrate:reset"
echo "  - Create new migrations with: npm run prisma:migrate -- --name <migration_name>"
echo ""
echo "🎉 P0 Backend database is ready for development!"