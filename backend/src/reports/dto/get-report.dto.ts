import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsNumber, IsOptional, Min } from 'class-validator';

export class GetAnnualReportDto {
  @ApiProperty({ example: 2025 })
  @IsNumber()
  @Min(2000)
  year!: number;

  @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsOptional()
  @IsMongoId()
  docId?: string;
}

export class GetMonthlyTrendDto {
  @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsOptional()
  @IsMongoId()
  docId?: string;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  months?: number;
}
