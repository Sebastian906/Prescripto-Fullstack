import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpsertConsentDto {
  @ApiProperty({ example: 'marketing' })
  @IsString()
  @IsNotEmpty()
  scope!: string;

  @ApiProperty({ example: 'v1' })
  @IsString()
  @IsNotEmpty()
  version!: string;

  @ApiProperty({
    example: 'granted',
    enum: ['pending', 'granted', 'denied', 'revoked'],
  })
  @IsIn(['pending', 'granted', 'denied', 'revoked'])
  status!: 'pending' | 'granted' | 'denied' | 'revoked';
}
