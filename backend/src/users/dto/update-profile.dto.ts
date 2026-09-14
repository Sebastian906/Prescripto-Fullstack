import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProfileUserDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString() @IsNotEmpty()
    name!: string;

    @ApiProperty({ example: '+1 234 567 890' })
    @IsString() @IsNotEmpty()
    phone!: string;

    @ApiProperty({ example: '{"line1":"123 Main St","line2":"Apt 4B, Anytown, USA"}' })
    @IsString() @IsNotEmpty()
    address!: string;

    @ApiProperty({ example: '1990-01-01' })
    @IsString() @IsNotEmpty()
    dob!: string;

    @ApiProperty({ example: 'Male' })
    @IsString() @IsNotEmpty()
    gender!: string;

    @ApiProperty({ type: 'string', format: 'binary', required: false })
    @IsOptional()
    image?: any;
}