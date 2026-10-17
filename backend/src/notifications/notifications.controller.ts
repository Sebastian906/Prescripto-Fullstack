import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { NotificationsService } from './notifications.service';

interface AuthRequest extends Request {
  userId?: string;
}

@ApiTags('Notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List my notifications (inbox)' })
  @ApiHeader({
    name: 'token',
    description: 'User JWT authentication token',
    required: true,
  })
  @ApiQuery({ name: 'unreadOnly', required: false, enum: ['true', 'false'] })
  @UseGuards(AuthUserGuard)
  list(@Req() req: AuthRequest, @Query('unreadOnly') unreadOnly?: string) {
    const userId = req.userId as string;
    return this.notifications.listForUser(userId, unreadOnly === 'true');
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one of my notifications as read' })
  @ApiHeader({
    name: 'token',
    description: 'User JWT authentication token',
    required: true,
  })
  @UseGuards(AuthUserGuard)
  markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    const userId = req.userId as string;
    return this.notifications.markRead(userId, id);
  }
}
