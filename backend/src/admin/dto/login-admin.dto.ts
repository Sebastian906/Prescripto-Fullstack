import { ApiProperty } from "@nestjs/swagger";

export class LoginAdminDto {
    @ApiProperty({ example: 'admin@prescripto.com' })
    email: string;

    @ApiProperty({ example: 'admin123' })
    password: string;
}