import { ApiProperty } from '@nestjs/swagger';

export class UpdateDoctorProfileDto {
    @ApiProperty({ example: 80 })
    fees: number;

    @ApiProperty({ example: '{"line1":"17th Cross","line2":"Richmond, London"}' })
    address: string; // llega como JSON string, se parsea en el service

    @ApiProperty({ example: true })
    available: boolean;
}