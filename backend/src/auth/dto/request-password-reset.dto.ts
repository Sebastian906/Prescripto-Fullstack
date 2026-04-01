import { ApiProperty } from '@nestjs/swagger';

export class RequestPasswordResetDto {
    @ApiProperty({ example: 'user@example.com' })
    email: string;

    @ApiProperty({ example: 'user', enum: ['user', 'doctor', 'admin'] })
    role: 'user' | 'doctor' | 'admin';
}