import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';

@ApiTags('Audit')
@Controller('api/audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('by-entity/:entityId')
  @ApiOperation({ summary: 'List audit trail for one entity (admin)' })
  @ApiHeader({
    name: 'atoken',
    description: 'Admin authentication token',
    required: true,
  })
  @UseGuards(AuthAdminGuard)
  findByEntity(@Param('entityId') entityId: string) {
    return this.audit.findByEntity(entityId);
  }
}
