import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsEnum } from 'class-validator';

export class RequestPasswordResetDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'user', enum: ['user', 'doctor', 'admin'] })
  @IsEnum(['user', 'doctor', 'admin'])
  role!: 'user' | 'doctor' | 'admin';
}
