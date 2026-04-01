import { ApiProperty } from '@nestjs/swagger';

export class DirectResetPasswordDto {
    @ApiProperty({ example: 'doctor@prescripto.com' })
    email: string;

    @ApiProperty({ example: 'user', enum: ['doctor', 'admin'] })
    role: 'doctor' | 'admin';

    @ApiProperty({ example: 'NewPassword123' })
    newPassword: string;
}