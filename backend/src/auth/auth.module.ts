import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from 'src/users/users.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
// import { MicrosoftStrategy } from './strategies/microsoft.strategy';
// import { TwitterStrategy } from './strategies/twitter.strategy';
import { PasswordResetService } from './password-reset.service';
import { DoctorsModule } from 'src/doctors/doctors.module';
import { MongooseModule } from '@nestjs/mongoose';
import { PasswordResetToken, PasswordResetTokenSchema } from './password-reset-token.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Doctor, DoctorSchema } from 'src/doctors/schemas/doctor.schema';

@Module({
  imports: [
    PassportModule,
    ConfigModule,
    UsersModule,
    DoctorsModule,
    MongooseModule.forFeature([
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: User.name, schema: UserSchema },
      { name: Doctor.name, schema: DoctorSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    GoogleStrategy,
    FacebookStrategy,
    PasswordResetService,
    //    MicrosoftStrategy,
    //    TwitterStrategy,
  ]
})
export class AuthModule { }
