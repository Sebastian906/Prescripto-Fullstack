import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginAdminDto {
  @ApiProperty({ example: 'admin@prescripto.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password!: string;
}
