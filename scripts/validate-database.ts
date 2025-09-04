import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function validateDatabase() {
  console.log('🔍 Validating database setup...');

  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connection successful');

    // Check if tables exist and have data
    const userCount = await prisma.user.count();
    const sessionCount = await prisma.session.count();
    const messageCount = await prisma.conversationMessage.count();

    console.log('\n📊 Database Statistics:');
    console.log(`  Users: ${userCount}`);
    console.log(`  Sessions: ${sessionCount}`);
    console.log(`  Messages: ${messageCount}`);

    // Test a complex query with relations
    const userWithSessions = await prisma.user.findFirst({
      include: {
        sessions: {
          include: {
            messages: true
          }
        }
      }
    });

    if (userWithSessions) {
      console.log('\n✅ Complex query with relations successful');
      console.log(`  User: ${userWithSessions.email}`);
      console.log(`  Sessions: ${userWithSessions.sessions.length}`);
      console.log(`  Total Messages: ${userWithSessions.sessions.reduce((sum, session) => sum + session.messages.length, 0)}`);
    }

    // Test enum values
    const activeSession = await prisma.session.findFirst({
      where: { status: 'ACTIVE' }
    });

    if (activeSession) {
      console.log('✅ Enum values working correctly');
    }

    console.log('\n🎉 Database validation completed successfully!');
    console.log('The database is ready for the P0 Backend application.');

  } catch (error) {
    console.error('❌ Database validation failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

validateDatabase();