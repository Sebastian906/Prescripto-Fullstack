// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy, IProfile, VerifyCallback } from 'passport-microsoft';
// import { UsersService } from 'src/users/users.service';

// @Injectable()
// export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
//     constructor(
//         configService: ConfigService,
//         private readonly usersService: UsersService,
//     ) {
//         super({
//             clientID: configService.get<string>('MICROSOFT_CLIENT_ID'),
//             clientSecret: configService.get<string>('MICROSOFT_CLIENT_SECRET'),
//             callbackURL: configService.get<string>('MICROSOFT_CALLBACK_URL'),
//             scope: ['user.read'],
//         });
//     }

//     async validate(
//         _accessToken: string,
//         _refreshToken: string,
//         profile: IProfile,
//         done: VerifyCallback,
//     ): Promise<void> {
//         const result = await this.usersService.loginOAuth({
//             name: profile.displayName ?? '',
//             email: profile.emails?.[0]?.value ?? '',
//             image: profile.photos?.[0]?.value,
//             provider: 'microsoft',
//         });

//         done(null, result);
//     }
// }