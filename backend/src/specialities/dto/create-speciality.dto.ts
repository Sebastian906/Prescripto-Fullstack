import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class CreateSpecialityDto {
  @ApiProperty({ example: 'General Surgery' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'general-surgery' })
  @IsString()
  @IsNotEmpty()
  slug!: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    description: 'ID of the parent speciality. Null if this is a root node.',
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 'Covers all general surgical procedures.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/icons/surgery.svg' })
  @IsOptional()
  @IsString()
  iconUrl?: string;
}
