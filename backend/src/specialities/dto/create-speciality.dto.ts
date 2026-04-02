import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSpecialityDto {
    @ApiProperty({ example: 'General Surgery' })
    name: string;

    @ApiProperty({ example: 'general-surgery' })
    slug: string;

    @ApiPropertyOptional({
        example: '507f1f77bcf86cd799439011',
        description: 'ID of the parent speciality. Null if this is a root node.',
    })
    parentId?: string | null;

    @ApiPropertyOptional({ example: 'Covers all general surgical procedures.' })
    description?: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/icons/surgery.svg' })
    iconUrl?: string;
}