import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsMongoId,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from 'class-validator';
import { WRITABLE_DIAGNOSIS_CODES } from '../catalog/diagnosis.catalog';

export class CreateMedicalRecordDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  appointmentId!: string;

  @ApiProperty({
    enum: WRITABLE_DIAGNOSIS_CODES,
    example: 'upper-respiratory-infection',
  })
  @IsIn(WRITABLE_DIAGNOSIS_CODES)
  diagnosis!: string;

  @ApiProperty({
    example: 'Patient presents with fever and cough for 3 days.',
    maxLength: 4000,
  })
  @IsString()
  @Length(1, 4000)
  notes!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'HTTPS attachment URLs (already uploaded elsewhere)',
    maxItems: 10,
    example: ['https://res.cloudinary.com/demo/medical/scan.pdf'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsUrl(
    { protocols: ['https'], require_protocol: true },
    { each: true, message: 'each attachment must be a valid HTTPS URL' },
  )
  @MaxLength(2048, { each: true })
  attachments?: string[];
}
