import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { WaitlistService } from './waitlist.service';

interface AuthRequest extends Request {
  userId?: string;
}

@ApiTags('Waitlist')
@Controller('api/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  @ApiOperation({ summary: 'Join the waitlist for a doctor and date' })
  @ApiHeader({
    name: 'token',
    description: 'User JWT authentication token',
    required: true,
  })
  @UseGuards(AuthUserGuard)
  async join(@Req() req: AuthRequest, @Body() dto: CreateWaitlistDto) {
    const userId = req.userId as string;
    return this.waitlistService.join(userId, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: 'List my waitlist entries (waiting + promoted)' })
  @ApiHeader({
    name: 'token',
    description: 'User JWT authentication token',
    required: true,
  })
  @UseGuards(AuthUserGuard)
  async listMine(@Req() req: AuthRequest) {
    const userId = req.userId as string;
    return this.waitlistService.listMine(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Leave the waitlist' })
  @ApiHeader({
    name: 'token',
    description: 'User JWT authentication token',
    required: true,
  })
  @UseGuards(AuthUserGuard)
  async leave(@Req() req: AuthRequest, @Param('id') id: string) {
    const userId = req.userId as string;
    return this.waitlistService.leave(userId, id);
  }
}
