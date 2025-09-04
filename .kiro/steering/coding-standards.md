# Coding Standards (CRITICAL - These rules overrule all other instructions)

## Architecture Philosophy (REFINED)

### Three-Layer Architecture
```typescript
// ✅ Controllers: Thin orchestration only
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() data: CreateUserDto, @HttpUser() user: User) {
    // Route handling, validation, response shaping only
    const newUser = await this.usersService.createUser(data, user);
    return ApiResponse.success(newUser, 'User created successfully');
  }

  @Put(':id')
  async updateUser(@Param('id') id: number, @Body() data: UpdateUserDto) {
    const updatedUser = await this.usersService.updateUser(id, data);
    return ApiResponse.success(updatedUser, 'User updated successfully');
  }
}

// ✅ Services: Business logic only
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async createUser(data: CreateUserDto, currentUser: User): Promise<User> {
    // Business logic - validation, calculations, orchestration
    Assert.isTrue(data.email.includes('@'), 'Invalid email format');
    
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    // Delegate DB operations to repository
    return this.usersRepository.create({
      ...data,
      password: hashedPassword,
      createdBy: currentUser.id
    });
  }

  async updateUser(id: number, data: UpdateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findById(id);
    Assert.notNull(existingUser, 'User not found');
    
    return this.usersRepository.update(id, data);
  }
}

// ✅ Repositories: Database operations only
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async findById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({ 
      where: { id },
      include: { profile: true }
    });
  }

  async update(id: number, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data
    });
  }
}
```

### HTTP Methods (REFINED)
```typescript
// ✅ Full REST semantics for clarity
@Get('users')           // List/read operations
@Get('users/:id')       // Get single resource
@Post('users')          // Create operations  
@Put('users/:id')       // Full resource replacement
@Patch('users/:id')     // Partial updates
@Delete('users/:id')    // Delete operations
```

### Authentication (REFINED)
```typescript
// ✅ Primary: JWT from HTTP-only cookies (secure for browsers)
@Post('login')
async login(@Res() response: Response, @Body() loginDto: LoginDto) {
  const token = await this.authService.validateUser(loginDto);
  response.cookie('jwt', token, { 
    httpOnly: true, 
    secure: true, 
    sameSite: 'strict' 
  });
  return ApiResponse.success(null, 'Login successful');
}

// ✅ Optional: Authorization header support for non-browser clients
@UseGuards(JwtAuthGuard) // Supports both cookie and header JWT
@Get('profile')
async getProfile(@HttpUser() user: User) {
  return ApiResponse.success(user, 'Profile retrieved');
}

// ✅ Flexible JWT extraction (cookie preferred, header fallback)
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.jwt || 
                  request.headers?.authorization?.replace('Bearer ', '');
    // Validate token...
  }
}
```

## Database Operations & Types

### Repository Pattern with Prisma
```typescript
// ✅ Repositories contain ALL Prisma/database logic
@Injectable()
export class StudentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.StudentCreateInput): Promise<Student> {
    return this.prisma.student.create({ data });
  }

  async findWithProfile(id: number): Promise<StudentWithRelations> {
    return this.prisma.student.findUnique({
      where: { id },
      include: {
        essays: true,
        achievements: true,
        collegeLists: { include: { colleges: true } },
        user: { include: { posts: true } }
      }
    });
  }

  async createWithProfile(userData: CreateStudentDto) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data: userData.user });
      const student = await tx.student.create({
        data: { ...userData.student, userId: user.id }
      });
      return { user, student };
    });
  }
}
```

### Types & DTOs Strategy
```typescript
// ✅ Use Prisma types internally
import { User, Student, Prisma } from '@prisma/client';

// ✅ Generate DTOs from Prisma types for API contracts
export class CreateUserDto implements Pick<Prisma.UserCreateInput, 'email' | 'name'> {
  @IsEmail()
  email: string;

  @IsString()
  name: string;
}

export class UserResponseDto implements Pick<User, 'id' | 'email' | 'name' | 'createdAt'> {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

// ✅ Extend Prisma types when needed for business logic
export type UserWithProfile = User & {
  profile: Profile;
  computedScore?: number; // Business logic field
};
```

### Response Patterns (REFINED)
```typescript
// ✅ Standard ApiResponse pattern for consistency
return ApiResponse.success(data, 'Operation successful');
return ApiResponse.error('USER_NOT_FOUND', 'User not found');

// ✅ Use interceptors/filters to reduce boilerplate
@UseInterceptors(ResponseInterceptor)
@Controller('users')
export class UsersController {
  @Get()
  async getUsers(): Promise<User[]> {
    // Interceptor automatically wraps in ApiResponse.success
    return this.usersService.findAll();
  }
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map(data => ApiResponse.success(data, 'Success'))
    );
  }
}

// ✅ Exception filters for consistent error responses
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    
    if (exception instanceof CustomException) {
      return response.json(ApiResponse.error(exception.code, exception.message));
    }
    
    return response.json(ApiResponse.error('INTERNAL_ERROR', 'Something went wrong'));
  }
}
```

### Validation & Error Handling
```typescript
// ✅ Use Assert for validation that throws
Assert.isTrue(user.isActive, 'User is not active');
Assert.notNull(user, 'User not found');

// ✅ Use Expect for conditional logic
const result = Expect.when(user.role === 'admin')
  .then(() => adminService.getData())
  .otherwise(() => regularService.getData());

// ✅ Custom exceptions with Result types
throw Exception.new('INVALID_CREDENTIALS', 'Invalid email or password');
```

## Code Organization

### Module Structure (REFINED)
```
/modules/users/
  users.controller.ts     # Route handling, validation, response shaping
  users.service.ts        # Business logic only
  users.repository.ts     # All Prisma/database operations
  users.module.ts         # Module definition
  dto/
    create-user.dto.ts    # Generated from Prisma types
    update-user.dto.ts    # Generated from Prisma types
    user-response.dto.ts  # API contract types
  types/
    user.types.ts         # Extended business logic types
```

### Import Order
```typescript
// 1. External libraries
import { Controller, Post, Body } from '@nestjs/common';
import { Prisma } from '@prisma/client';

// 2. Internal modules  
import { UsersService } from './users.service';
import { ApiResponse } from '../common/responses';

// 3. Relative imports
import { CreateUserDto } from './dto/create-user.dto';
```

## Testing Strategy

### Focus Areas
- **Core functionality**: Business logic, critical user flows, data operations
- **Integration tests**: Complete user workflows over isolated units
- **Avoid excessive coverage**: Don't test trivial functions or third-party code

### What NOT to Test
- Simple UI components with no logic
- Third-party library functionality  
- Trivial getter/setter methods
- Static configuration files
- Basic TypeScript type definitions

## Code Quality

### Comments & Documentation
```typescript
// ✅ Minimal comments - code should be self-documenting
async calculateUserScore(user: User): Promise<number> {
  // Complex algorithm requires explanation
  const baseScore = user.achievements.length * 10;
  
  // Workaround for legacy data format - remove after migration
  const legacyBonus = user.metadata?.oldFormat ? 5 : 0;
  
  return baseScore + legacyBonus;
}

// ❌ Avoid obvious comments
const userId = user.id; // Gets the user ID - unnecessary comment
```

### Code Review Checklist (REFINED)
- [ ] Controllers: Thin orchestration only (no business logic)
- [ ] Services: Business logic only (no DB operations)
- [ ] Repositories: All Prisma/database operations
- [ ] Uses appropriate HTTP methods (GET/POST/PUT/PATCH/DELETE)
- [ ] JWT from cookies (with optional header support)
- [ ] DTOs generated from Prisma types
- [ ] ApiResponse pattern with interceptors/filters
- [ ] Assert/Expect for validation
- [ ] Proper error handling with custom exceptions
- [ ] Follows three-layer architecture
- [ ] Uses transactions for related DB operations

## Response Format Guidelines

When providing code solutions:
1. **Explain approach briefly** - What pattern/strategy you're using
2. **Show implementation** - Complete code with proper types
3. **Highlight architectural decisions** - Why Controllers over Services
4. **Mention integration points** - How it connects to existing code
5. **Discuss trade-offs** - Pros/cons vs alternatives
6. **Minimal comments** - Only for complex/non-obvious parts

Always prioritize maintainability, performance, and adherence to these project-specific patterns over standard NestJS conventions.