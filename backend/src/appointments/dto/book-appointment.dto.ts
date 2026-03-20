import { ApiProperty } from '@nestjs/swagger';

export class BookAppointmentDto {
    @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
    docId: string;

    @ApiProperty({ example: '20_7_2025' })
    slotDate: string;

    @ApiProperty({ example: '10:00 am' })
    slotTime: string;
}