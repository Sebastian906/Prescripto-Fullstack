import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
    @ApiProperty({ example: 'John Doe' })
    name: string;

    @ApiProperty({ example: 'john.doe@example.com' })
    email: string;

    @ApiProperty({ example: 'Password123' })
    password: string;
}