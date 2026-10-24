import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsMongoId,
  IsString,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PrescriptionItemDto {
  @ApiProperty({
    example: 'amoxicillin',
    description:
      'Drug name. No catalog exists in this repo yet; min-length validation applies.',
    minLength: 2,
    maxLength: 120,
  })
  @IsString()
  @Length(2, 120)
  drug!: string;

  @ApiProperty({ example: '500 mg', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  dose!: string;

  @ApiProperty({ example: 'every 8 hours', minLength: 1, maxLength: 80 })
  @IsString()
  @Length(1, 80)
  frequency!: string;

  @ApiProperty({ example: 7, minimum: 1, maximum: 365 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;
}

export class CreatePrescriptionDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  recordId!: string;

  @ApiProperty({ type: [PrescriptionItemDto], minItems: 1, maxItems: 25 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(25)
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  items!: PrescriptionItemDto[];
}
