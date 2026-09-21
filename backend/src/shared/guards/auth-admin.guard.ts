import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Observable } from 'rxjs';
import {
  getJwtSecrets,
  isPreviousAccepted,
} from 'src/shared/utils/jwt-secrets.util';

@Injectable()
export class AuthAdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const atoken = request.headers['atoken'] as string;

    if (!atoken) {
      throw new UnauthorizedException('Not Authorized, Login Again');
    }

    const secrets = getJwtSecrets(this.configService);
    const adminEmail = this.configService.get<string>('ADMIN_EMAIL', '');
    const adminPassword = this.configService.get<string>('ADMIN_PASSWORD', '');
    const adminCredentials = adminEmail + adminPassword;
    for (const secret of [
      secrets.current,
      ...(isPreviousAccepted(secrets) ? [secrets.previous] : []),
    ]) {
      try {
        const tokenDecode = this.jwtService.verify(atoken, { secret });
        if (tokenDecode !== adminCredentials) {
          throw new UnauthorizedException('Not Authorized, Login Again');
        }
        return true;
      } catch (e) {
        if (e instanceof UnauthorizedException) throw e;
        continue;
      }
    }

    throw new UnauthorizedException('Not Authorized, Login Again');
  }
}
