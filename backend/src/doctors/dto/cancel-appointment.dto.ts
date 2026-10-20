import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelAppointmentDoctorDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  appointmentId!: string;

  @ApiPropertyOptional({ example: 'No podré atender ese horario.' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}
