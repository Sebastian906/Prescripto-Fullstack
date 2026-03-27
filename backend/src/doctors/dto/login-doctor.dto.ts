import { ApiProperty } from '@nestjs/swagger';

export class LoginDoctorDto {
    @ApiProperty({ example: 'doctor@prescripto.com' })
    email: string;

    @ApiProperty({ example: 'Password123' })
    password: string;
}