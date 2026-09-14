import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';

export class DirectResetPasswordDto {
    @ApiProperty({ example: 'doctor@prescripto.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'user', enum: ['doctor', 'admin'] })
    @IsEnum(['doctor', 'admin'] as any)
    role!: 'doctor' | 'admin';

    @ApiProperty({ example: 'NewPassword123' })
    @IsString() @MinLength(6)
    newPassword!: string;
}