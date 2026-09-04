import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';

// Tüm HTTP endpoint'lerini tek, paylaşılan bir anahtarla korur (bkz. AppModule'deki APP_GUARD kaydı).
// CLI'yı etkilemez — CLI Nest HTTP katmanından değil, doğrudan Prisma üzerinden çalışır.
@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.header('x-api-key') !== process.env.API_KEY) {
      throw new UnauthorizedException('Geçersiz veya eksik API anahtarı');
    }
    return true;
  }
}
