import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import {
  CreateReferralAdminDto,
  CreateReferralDto,
} from './dto/create-referral.dto';
import { QueryReferralsDto } from './dto/query-referrals.dto';
import {
  ReferralGraph,
  ReferralListResponse,
  ReferralsService,
} from './referrals.service';

interface AuthDoctorRequest extends Request {
  docId?: string;
}

const referralPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});

@ApiTags('Referrals')
@Controller('api/referrals')
@UsePipes(referralPipe)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a referral for myself (doctor only)' })
  @ApiHeader({ name: 'dtoken', description: 'Doctor token', required: true })
  @UseGuards(AuthDoctorGuard)
  async createMine(
    @Req() req: AuthDoctorRequest,
    @Body() dto: CreateReferralDto,
  ) {
    const docId = req.docId as string;
    return this.referralsService.createForDoctor(
      docId,
      dto.toDoctorId,
      dto.reason,
      dto.fromDoctorId,
    );
  }

  @Post('admin')
  @ApiOperation({ summary: 'Create any referral (admin only)' })
  @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
  @UseGuards(AuthAdminGuard)
  async createAny(@Body() dto: CreateReferralAdminDto) {
    return this.referralsService.createForAdmin(dto);
  }

  @Get('to/:doctorId')
  @ApiOperation({
    summary: 'Who refers to X? Reverse BFS capped at 2 hops (public)',
  })
  @ApiParam({ name: 'doctorId', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @ApiQuery({ name: 'hops', required: false, enum: ['1', '2'], example: '2' })
  async findReferrers(
    @Param('doctorId') doctorId: string,
    @Query() query: QueryReferralsDto,
  ): Promise<ReferralGraph> {
    return this.referralsService.findReferrers(doctorId, query.hops ?? 2);
  }

  @Get('from/:doctorId')
  @ApiOperation({ summary: 'List referrals created by a doctor (public)' })
  @ApiParam({ name: 'doctorId', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  async listFrom(
    @Param('doctorId') doctorId: string,
  ): Promise<ReferralListResponse> {
    return this.referralsService.listFrom(doctorId);
  }

  @Get('admin/all')
  @ApiOperation({ summary: 'List all referrals (admin only)' })
  @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
  @UseGuards(AuthAdminGuard)
  async listAll(): Promise<ReferralListResponse> {
    return this.referralsService.listAll();
  }
}
