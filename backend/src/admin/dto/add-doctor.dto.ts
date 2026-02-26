import { ApiProperty } from "@nestjs/swagger";

export class AddDoctorDto {
    @ApiProperty({ example: 'Dr. John Doe' })
    name: string;

    @ApiProperty({ example: 'john.doe@prescripto.com' })
    email: string;

    @ApiProperty({ example: 'Password123' })
    password: string;

    @ApiProperty({ example: 'General physician' })
    speciality: string;

    @ApiProperty({ example: 'MBBS' })
    degree: string;

    @ApiProperty({ example: '4 Years' })
    experience: string;

    @ApiProperty({ example: 'Experienced physician focused on preventive care.' })
    about: string;

    @ApiProperty({ example: 50 })
    fees: number;

    @ApiProperty({ example: '{"line1":"17th Cross, Richmond","line2":"Circle, Ring Road, London"}' })
    address: string;   // llega como string JSON desde el form-data, se parsea en el service

    @ApiProperty({ type: 'string', format: 'binary', required: true })
    image: any;        // el archivo, solo para que Swagger lo muestre
}