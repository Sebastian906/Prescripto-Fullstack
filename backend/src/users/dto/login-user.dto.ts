import { ApiProperty } from "@nestjs/swagger";

export class LoginUserDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    email: string;

    @ApiProperty({ example: 'Password123' })
    password: string;
}