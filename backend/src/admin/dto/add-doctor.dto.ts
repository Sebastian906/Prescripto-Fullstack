import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString, IsEmail, Min } from "class-validator";

export class AddDoctorDto {
    @ApiProperty({ example: 'Dr. John Doe' })
    @IsString() @IsNotEmpty()
    name!: string;

    @ApiProperty({ example: 'john.doe@prescripto.com' })
    @IsEmail()
    email!: string;

    @ApiProperty({ example: 'Password123' })
    @IsString() @IsNotEmpty()
    password!: string;

    @ApiProperty({ example: 'General physician' })
    @IsString() @IsNotEmpty()
    speciality!: string;

    @ApiProperty({ example: 'MBBS' })
    @IsString() @IsNotEmpty()
    degree!: string;

    @ApiProperty({ example: '4 Years' })
    @IsString() @IsNotEmpty()
    experience!: string;

    @ApiProperty({ example: 'Experienced physician focused on preventive care.' })
    @IsString() @IsNotEmpty()
    about!: string;

    @ApiProperty({ example: 50 })
    @IsNumber() @Min(0)
    fees!: number;

    @ApiProperty({ example: '{"line1":"17th Cross, Richmond","line2":"Circle, Ring Road, London"}' })
    @IsString() @IsNotEmpty()
    address!: string;

    @ApiProperty({ type: 'string', format: 'binary', required: true })
    @IsOptional()
    image?: any;
}