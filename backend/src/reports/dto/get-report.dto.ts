import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GetAnnualReportDto {
    @ApiProperty({ example: 2025 })
    year: number;

    // Si se omite, devuelve reporte global del sistema
    @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
    docId?: string;
}

export class GetMonthlyTrendDto {
    @ApiPropertyOptional({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
    docId?: string;

    // Cuántos meses hacia atrás. Default 12.
    @ApiPropertyOptional({ example: 12 })
    months?: number;
}