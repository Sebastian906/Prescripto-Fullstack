import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { PHONE_E164_PATTERN } from 'src/shared/utils/validators';

export class RegisterUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: '+573001234567', required: false })
  @IsOptional()
  @IsString()
  @Matches(PHONE_E164_PATTERN, { message: 'phone must be E.164' })
  phone?: string;
}
