import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { GoogleStrategy } from './strategies/google.strategy';
// import { FacebookStrategy } from './strategies/facebook.strategy';
// import { MicrosoftStrategy } from './strategies/microsoft.strategy';
// import { TwitterStrategy } from './strategies/twitter.strategy';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    GoogleStrategy,
//    FacebookStrategy,
//    MicrosoftStrategy,
//    TwitterStrategy,
  ]
})
export class AuthModule {}
