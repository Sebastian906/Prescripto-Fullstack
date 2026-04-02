import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSpecialityDto {
    @ApiPropertyOptional({ example: 'General Surgery Updated' })
    name?: string;

    @ApiPropertyOptional({ example: 'general-surgery-updated' })
    slug?: string;

    @ApiPropertyOptional({
        example: '507f1f77bcf86cd799439011',
        nullable: true,
    })
    parentId?: string | null;

    @ApiPropertyOptional({ example: 'Updated description.' })
    description?: string;

    @ApiPropertyOptional({ example: 'https://cdn.example.com/icons/surgery-v2.svg' })
    iconUrl?: string;

    @ApiPropertyOptional({ example: true })
    active?: boolean;
}