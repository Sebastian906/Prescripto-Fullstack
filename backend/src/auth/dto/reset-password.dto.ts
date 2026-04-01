import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
    @ApiProperty({ example: 'abc123token...' })
    token: string;

    @ApiProperty({ example: 'NewPassword123' })
    newPassword: string;
}