import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { SuggestSlotDto } from './dto/suggest-slot.dto';

@ApiTags('Scheduling')
@Controller('api/scheduling')
export class SchedulingController {
    constructor(private readonly schedulingService: SchedulingService) { }

    @Post('suggest-slot')
    @ApiOperation({ summary: 'Get AI-ranked slot suggestions for a doctor' })
    @ApiHeader({ name: 'token', required: true })
    @UseGuards(AuthUserGuard)
    async suggestSlot(@Body() dto: SuggestSlotDto) {
        return this.schedulingService.suggestSlots(dto);
    }
}