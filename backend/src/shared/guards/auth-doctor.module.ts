import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthDoctorGuard } from './auth-doctor.guard';

@Module({
    imports: [
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
            }),
            inject: [ConfigService],
        }),
    ],
    providers: [AuthDoctorGuard],
    exports: [AuthDoctorGuard, JwtModule],
})
export class AuthDoctorModule {}
