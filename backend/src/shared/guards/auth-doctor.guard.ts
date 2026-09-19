import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';
import { getJwtSecrets, isPreviousAccepted } from "src/shared/utils/jwt-secrets.util";

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

    const secrets = getJwtSecrets(this.configService);

    try {
      const tokenDecode = this.jwtService.verify<{ id: string }>(dtoken, {
        secret: secrets.current,
      });

      (request as any).docId = tokenDecode.id;

      return true;
    } catch (firstErr) {
      if (isPreviousAccepted(secrets)) {
        try {
          const tokenDecode = this.jwtService.verify<{ id: string }>(dtoken, {
            secret: secrets.previous,
          });
          (request as any).docId = tokenDecode.id;
          return true;
        } catch { /* fall through */ }
      }
      throw new UnauthorizedException('Not Authorized, Login Again');
    }
  }
}