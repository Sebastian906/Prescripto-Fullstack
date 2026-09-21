import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
} from 'class-validator';

export class UpdateDoctorProfileDto {
  @ApiProperty({ example: 80 })
  @IsNumber()
  @Min(0)
  fees!: number;

  @ApiProperty({ example: '{"line1":"17th Cross","line2":"Richmond, London"}' })
  @IsString()
  @IsNotEmpty()
  address!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  available!: boolean;
}
