import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

export class QueryReferralsDto {
  @ApiPropertyOptional({
    example: 2,
    description: 'BFS depth. Only 1 or 2. Anything else is 400.',
    enum: [1, 2],
    default: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([1, 2])
  hops?: number;
}
