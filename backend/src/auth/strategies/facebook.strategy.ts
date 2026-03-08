import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-facebook';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
    constructor(
        configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            clientID: configService.get<string>('FACEBOOK_CLIENT_ID')!,
            clientSecret: configService.get<string>('FACEBOOK_CLIENT_SECRET')!,
            callbackURL: configService.get<string>('FACEBOOK_CALLBACK_URL')!,
            scope: ['email'],
            profileFields: ['id', 'displayName', 'emails', 'photos'],
        });
    }

    async validate(
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (err: any, user?: any) => void,
    ): Promise<void> {
        const result = await this.usersService.loginOAuth({
            name: profile.displayName ?? '',
            email: profile.emails?.[0]?.value ?? '',
            image: profile.photos?.[0]?.value,
            provider: 'facebook',
        });

        done(null, result);
    }
}