import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Observable } from 'rxjs';

@Injectable()
export class AuthAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const atoken = request.headers['atoken'] as string;

    if (!atoken) {
      throw new UnauthorizedException('Not Authorized, Login Again');
    }

    try {
      const tokenDecode = this.jwtService.verify(atoken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const adminEmail = this.configService.get<string>('ADMIN_EMAIL', '');
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', '');
      const adminCredentials = adminEmail + adminPassword;

      if (tokenDecode !== adminCredentials) {
        throw new UnauthorizedException('Not Authorized, Login Again');
      }

      return true;
    } catch {
      throw new UnauthorizedException('Not Authorized, Login Again');
    }
  }
}
