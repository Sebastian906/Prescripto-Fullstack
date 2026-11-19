import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  Matches,
  IsOptional,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import {
  GENDER_VALUES,
  PHONE_E164_PATTERN,
  isIsoDate,
  normalizeDob,
  normalizeGender,
  normalizePhone,
} from 'src/shared/utils/validators';

@ValidatorConstraint({ name: 'isIsoDate', async: false })
class IsIsoDateConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isIsoDate(value);
  }

  defaultMessage(): string {
    return 'dob must be a valid ISO date (YYYY-MM-DD)';
  }
}

export class UpdateProfileUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: '+573001234567' })
  @IsString()
  @IsNotEmpty()
  @Matches(PHONE_E164_PATTERN, { message: 'phone must be E.164' })
  @Transform(({ value }) =>
    value === undefined ? undefined : normalizePhone(value),
  )
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
  @Transform(({ value }) =>
    value === undefined ? undefined : normalizeDob(value),
  )
  @IsNotEmpty()
  @Validate(IsIsoDateConstraint)
  dob!: string;

  @ApiProperty({ example: 'Male' })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) =>
    value === undefined ? undefined : normalizeGender(value),
  )
  @IsIn([...GENDER_VALUES])
  gender!: string;

  @ApiProperty({ type: 'string', format: 'binary', required: false })
  @IsOptional()
  image?: any;
}
