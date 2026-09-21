import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId } from 'class-validator';

export class CancelAppointmentDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  appointmentId!: string;
}
