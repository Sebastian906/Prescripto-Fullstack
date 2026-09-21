import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Matches } from 'class-validator';

export class BookAppointmentDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  docId!: string;

  @ApiProperty({ example: '20_7_2025' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{1,2}_\d{1,2}_\d{4}$/, { message: 'slotDate must be D_M_YYYY' })
  slotDate!: string;

  @ApiProperty({ example: '10:00 am' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^([1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/, {
    message: 'slotTime must be HH:MM AM/PM',
  })
  slotTime!: string;
}
