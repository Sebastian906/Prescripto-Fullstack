import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from 'express';
import { getJwtSecrets, isPreviousAccepted } from "src/shared/utils/jwt-secrets.util";

@Injectable()
export class AuthUserGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<Request>();

        const token = request.headers['token'] as string;

        if (!token) {
            throw new UnauthorizedException('Not Authorized Login Again');
        }

        const secrets = getJwtSecrets(this.configService);
        try {
            const tokenDecode = this.jwtService.verify<{ id: string }>(token, {
                secret: secrets.current,
            });

            (request as any).userId = tokenDecode.id;

            return true;
        } catch (firstErr) {
            if (isPreviousAccepted(secrets)) {
                try {
                    const tokenDecode = this.jwtService.verify<{ id: string }>(token, {
                        secret: secrets.previous,
                    });
                    (request as any).userId = tokenDecode.id;
                    return true;
                } catch { /* fall through */ }
            }
            throw new UnauthorizedException('Not Authorized Login Again');
        }
    }
}