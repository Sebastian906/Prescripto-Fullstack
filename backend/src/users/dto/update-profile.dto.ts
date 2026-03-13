import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileUserDto {
    @ApiProperty({ example: 'John Doe' })
    name: string;

    @ApiProperty({ example: '+1 234 567 890' })
    phone: string;

    @ApiProperty({ example: '{"line1":"123 Main St","line2":"Apt 4B, Anytown, USA"}' })
    address: string; // llega como JSON string desde form-data, se parsea en el service

    @ApiProperty({ example: '1990-01-01' })
    dob: string;

    @ApiProperty({ example: 'Male' })
    gender: string;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    image?: any; // archivo opcional, solo para Swagger
}