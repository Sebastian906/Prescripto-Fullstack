import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';

export class UpdateSpecialityDto {
  @ApiPropertyOptional({ example: 'General Surgery Updated' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'general-surgery-updated' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slug?: string;

  @ApiPropertyOptional({
    example: '507f1f77bcf86cd799439011',
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsMongoId()
  parentId?: string | null;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/icons/surgery-v2.svg',
  })
  @IsOptional()
  @IsString()
  iconUrl?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
