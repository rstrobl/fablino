import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const auth = request.headers.authorization;
    
    if (!auth) {
      response.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
      throw new UnauthorizedException('Authentication required');
    }

    const credentials = Buffer.from(auth.split(' ')[1], 'base64').toString().split(':');
    const username = credentials[0];
    const password = credentials[1];

    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD') || 'fablino2026';

    if (username !== 'admin' || password !== adminPassword) {
      response.setHeader('WWW-Authenticate', 'Basic realm="Admin"');
      throw new UnauthorizedException('Invalid credentials');
    }

    return true;
  }
}