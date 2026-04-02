import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SuggestSlotDto {
    @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
    docId: string;

    @ApiProperty({ example: ['15/7/2025', '16/7/2025', '17/7/2025'] })
    preferredDates: string[];

    @ApiProperty({ enum: ['urgent', 'normal', 'flexible'] })
    priorityLevel: 'urgent' | 'normal' | 'flexible';

    @ApiPropertyOptional({ example: 30 })
    minGapMinutes?: number;
}