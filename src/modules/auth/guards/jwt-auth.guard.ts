import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract JWT from cookie (primary) or header (fallback)
    const token =
      request.cookies?.jwt ||
      request.headers?.authorization?.replace('Bearer ', '');

    if (token && !request.headers.authorization) {
      // If we found token in cookie but not in header, set it in header for passport
      request.headers.authorization = `Bearer ${token}`;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
