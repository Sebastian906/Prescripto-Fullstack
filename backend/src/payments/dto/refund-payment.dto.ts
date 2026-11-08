import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class RefundPaymentDto {
  @ApiPropertyOptional({
    example: 100,
    description: 'Amount in major units. Omit for a full refund.',
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;
}
