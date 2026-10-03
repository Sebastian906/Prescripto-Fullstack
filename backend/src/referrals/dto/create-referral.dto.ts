import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ReferralReason } from '../referrals.constants';

export class CreateReferralDto {
  @ApiProperty({
    example: '64f1a2b3c4d5e6f7a8b9c0d1',
    description: 'Destination specialist doctor id',
  })
  @IsMongoId()
  toDoctorId!: string;

  @ApiProperty({
    enum: ReferralReason,
    example: ReferralReason.CardiologyEvaluation,
  })
  @IsEnum(ReferralReason)
  reason!: ReferralReason;

  @ApiPropertyOptional({
    example: '64f1a2b3c4d5e6f7a8b9c0d2',
    description:
      'Optional echo of the caller id. If present it must equal the dtoken identity, otherwise 403.',
  })
  @IsOptional()
  @IsMongoId()
  fromDoctorId?: string;
}

export class CreateReferralAdminDto {
  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d2' })
  @IsMongoId()
  fromDoctorId!: string;

  @ApiProperty({ example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  toDoctorId!: string;

  @ApiProperty({
    enum: ReferralReason,
    example: ReferralReason.DermatologyConsult,
  })
  @IsEnum(ReferralReason)
  reason!: ReferralReason;
}
