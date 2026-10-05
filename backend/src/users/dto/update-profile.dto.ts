import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { PHONE_E164_PATTERN } from 'src/shared/utils/validators';

export class UpdateProfileUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '+573001234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_E164_PATTERN, { message: 'phone must be E.164' })
  phone!: string;

  @ApiProperty({
    example: '{"line1":"123 Main St","line2":"Apt 4B, Anytown, USA"}',
  })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: '1990-01-01' })
  @IsString()
  @IsNotEmpty()
  dob!: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  @IsNotEmpty()
  gender!: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  image?: any;
}
