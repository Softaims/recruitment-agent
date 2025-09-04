import { PrismaClient, SessionStatus, MessageRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create test users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const testUser1 = await prisma.user.upsert({
    where: { email: 'recruiter@example.com' },
    update: {},
    create: {
      email: 'recruiter@example.com',
      name: 'Jane Recruiter',
      preferences: {
        communicationStyle: 'professional',
        industryFocus: ['technology', 'finance'],
        experienceLevels: ['mid-level', 'senior'],
        defaultSearchFilters: {
          location: 'remote',
          salaryRange: { min: 80000, max: 150000 }
        }
      }
    }
  });

  const testUser2 = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      preferences: {
        communicationStyle: 'casual',
        industryFocus: ['technology'],
        experienceLevels: ['all'],
        defaultSearchFilters: {}
      }
    }
  });

  console.log('✅ Created test users:', { testUser1: testUser1.email, testUser2: testUser2.email });

  // Create sample sessions
  const session1 = await prisma.session.create({
    data: {
      userId: testUser1.id,
      status: SessionStatus.ACTIVE,
      context: {
        currentRequirements: {
          title: 'Senior Full Stack Developer',
          technicalSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
          experienceLevel: 'senior',
          location: 'remote'
        },
        conversationSummary: 'Discussing requirements for a senior full stack developer role'
      },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now
    }
  });

  const session2 = await prisma.session.create({
    data: {
      userId: testUser2.id,
      status: SessionStatus.INACTIVE,
      context: {
        currentRequirements: {
          title: 'DevOps Engineer',
          technicalSkills: ['AWS', 'Docker', 'Kubernetes', 'Terraform'],
          experienceLevel: 'mid-level',
          location: 'hybrid'
        }
      },
      expiresAt: new Date(Date.now() + 30 * 60 * 1000)
    }
  });

  console.log('✅ Created sample sessions:', { session1: session1.id, session2: session2.id });

  // Create sample conversation messages
  const messages = [
    {
      sessionId: session1.id,
      role: MessageRole.USER,
      content: 'Hi, I need help finding a senior full stack developer for my team.',
      metadata: { timestamp: new Date().toISOString() }
    },
    {
      sessionId: session1.id,
      role: MessageRole.ASSISTANT,
      content: 'I\'d be happy to help you find a senior full stack developer! Let me ask you a few questions to understand your requirements better. What specific technologies and frameworks are most important for this role?',
      metadata: { 
        timestamp: new Date().toISOString(),
        tokenCount: 45,
        processingTime: 1200
      }
    },
    {
      sessionId: session1.id,
      role: MessageRole.USER,
      content: 'We primarily use React for the frontend, Node.js with TypeScript for the backend, and PostgreSQL for our database. The candidate should have at least 5 years of experience.',
      metadata: { timestamp: new Date().toISOString() }
    },
    {
      sessionId: session1.id,
      role: MessageRole.ASSISTANT,
      content: 'Perfect! So we\'re looking for a senior developer with React, Node.js, TypeScript, and PostgreSQL experience. A few more questions: What\'s your preference for work arrangement - remote, hybrid, or on-site? And what\'s the salary range you have in mind?',
      metadata: { 
        timestamp: new Date().toISOString(),
        tokenCount: 52,
        processingTime: 980,
        requirementsExtracted: {
          title: 'Senior Full Stack Developer',
          technicalSkills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'],
          experienceLevel: 'senior',
          yearsOfExperience: 5
        }
      }
    },
    {
      sessionId: session2.id,
      role: MessageRole.USER,
      content: 'I\'m looking for a DevOps engineer with cloud experience.',
      metadata: { timestamp: new Date().toISOString() }
    },
    {
      sessionId: session2.id,
      role: MessageRole.ASSISTANT,
      content: 'Great! DevOps engineers with cloud experience are in high demand. Which cloud platform do you primarily use - AWS, Azure, or Google Cloud? And what specific DevOps tools and practices are important for your team?',
      metadata: { 
        timestamp: new Date().toISOString(),
        tokenCount: 41,
        processingTime: 1100
      }
    }
  ];

  for (const messageData of messages) {
    await prisma.conversationMessage.create({
      data: messageData
    });
  }

  console.log('✅ Created sample conversation messages');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`- Users: ${await prisma.user.count()}`);
  console.log(`- Sessions: ${await prisma.session.count()}`);
  console.log(`- Messages: ${await prisma.conversationMessage.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });