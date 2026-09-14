import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @ApiProperty({ example: 'abc123token...' })
    @IsString() @IsNotEmpty()
    token!: string;

    @ApiProperty({ example: 'NewPassword123' })
    @IsString() @MinLength(6)
    newPassword!: string;
}