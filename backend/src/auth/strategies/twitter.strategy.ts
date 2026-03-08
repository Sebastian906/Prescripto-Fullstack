// import { Injectable } from '@nestjs/common';
// import { ConfigService } from '@nestjs/config';
// import { PassportStrategy } from '@nestjs/passport';
// import { Strategy, Profile } from 'passport-twitter';
// import { UsersService } from 'src/users/users.service';

// @Injectable()
// export class TwitterStrategy extends PassportStrategy(Strategy, 'twitter') {
//     constructor(
//         configService: ConfigService,
//         private readonly usersService: UsersService,
//     ) {
//         super({
//             consumerKey: configService.get<string>('TWITTER_CONSUMER_KEY')!,
//             consumerSecret: configService.get<string>('TWITTER_CONSUMER_SECRET')!,
//             callbackURL: configService.get<string>('TWITTER_CALLBACK_URL')!,
//             includeEmail: true,
//         });
//     }

//     async validate(
//         _token: string,
//         _tokenSecret: string,
//         profile: Profile,
//         done: (err: any, user?: any) => void,
//     ): Promise<void> {
//         const result = await this.usersService.loginOAuth({
//             name: profile.displayName ?? '',
//             email: profile.emails?.[0]?.value ?? '',
//             image: profile.photos?.[0]?.value,
//             provider: 'twitter',
//         });

//         done(null, result);
//     }
// }