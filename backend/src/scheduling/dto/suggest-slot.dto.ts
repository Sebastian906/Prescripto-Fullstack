import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, ArrayMinSize, IsEnum, IsMongoId, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SuggestSlotDto {
    @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
    @IsMongoId()
    docId!: string;

    @ApiProperty({ example: ['15/7/2025', '16/7/2025', '17/7/2025'] })
    @IsArray() @ArrayMinSize(1)
    @IsString({ each: true })
    preferredDates!: string[];

    @ApiProperty({ enum: ['urgent', 'normal', 'flexible'] })
    @IsEnum(['urgent', 'normal', 'flexible'] as any)
    priorityLevel!: 'urgent' | 'normal' | 'flexible';

    @ApiPropertyOptional({ example: 30 })
    @IsOptional() @IsNumber() @Min(0)
    minGapMinutes?: number;
}