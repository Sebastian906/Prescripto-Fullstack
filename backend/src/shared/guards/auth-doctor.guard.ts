import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
@Injectable()
export class AuthDoctorGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const dtoken = request.headers['dtoken'] as string;

    if (!dtoken) {
      throw new UnauthorizedException('Not Authorized, Login Again');
    }

    try {
      const tokenDecode = this.jwtService.verify<{ id: string }>(dtoken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      (request as any).docId = tokenDecode.id;

      return true;
    } catch {
      throw new UnauthorizedException('Not Authorized, Login Again');
    }
  }
}