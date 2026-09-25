import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsMongoId } from 'class-validator';

export class CreateWaitlistDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  doctorId!: string;

  @ApiProperty({
    example: '2026-10-05T14:30:00.000Z',
    description:
      'Desired date-time (ISO-8601). Hour 00-11 derives AM, 12-23 derives PM.',
  })
  @IsISO8601()
  wantedDate!: string;
}
