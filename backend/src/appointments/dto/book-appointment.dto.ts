import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString, Matches } from 'class-validator';
import {
  BOOK_SLOT_DATE_PATTERN,
  SLOT_TIME_PATTERN,
} from 'src/shared/utils/validators';

export class BookAppointmentDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  docId!: string;

  @ApiProperty({ example: '20_7_2025' })
  @IsString()
  @IsNotEmpty()
  @Matches(BOOK_SLOT_DATE_PATTERN, { message: 'slotDate must be D_M_YYYY' })
  slotDate!: string;

  @ApiProperty({ example: '10:00 am' })
  @IsString()
  @IsNotEmpty()
  @Matches(SLOT_TIME_PATTERN, {
    message: 'slotTime must be HH:MM AM/PM',
  })
  slotTime!: string;
}
