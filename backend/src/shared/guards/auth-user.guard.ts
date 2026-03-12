import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Request } from 'express';

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

        try {
            const tokenDecode = this.jwtService.verify<{ id: string }>(token, {
                secret: this.configService.get<string>('JWT_SECRET'),
            });

            (request as any).userId = tokenDecode.id;

            return true;
        } catch {
            throw new UnauthorizedException('Not Authorized Login Again');
        }
    }
}