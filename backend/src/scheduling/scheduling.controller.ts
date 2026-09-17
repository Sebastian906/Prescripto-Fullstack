import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SchedulingService } from './scheduling.service';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { SuggestSlotDto } from './dto/suggest-slot.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Scheduling')
@Controller('api/scheduling')
export class SchedulingController {
    constructor(private readonly schedulingService: SchedulingService) { }

    @Post('suggest-slot')
    @ApiOperation({ summary: 'Get AI-ranked slot suggestions for a doctor' })
    @ApiHeader({ name: 'token', required: true })
    @UseGuards(AuthUserGuard)
    @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30/min, keyed by user when available else IP
    async suggestSlot(@Body() dto: SuggestSlotDto) {
        // getTracker prefers req.userId (AuthUserGuard) → per-user; falls back to IP
        // because APP_GUARD runs before route-level guards.
        return this.schedulingService.suggestSlots(dto);
    }
}