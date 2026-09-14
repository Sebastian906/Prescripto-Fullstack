import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDoctorDto {
    @ApiProperty({ example: 'doctor@prescripto.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'Password123' })
    @IsString() @MinLength(6)
    password!: string;
}