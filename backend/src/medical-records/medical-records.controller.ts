import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { QueryMedicalRecordsDto } from './dto/query-medical-records.dto';
import { MedicalRecordsService } from './medical-records.service';

interface AuthDoctorRequest extends Request {
  docId?: string;
}

interface AuthUserRequest extends Request {
  userId?: string;
}

@ApiTags('Medical Records')
@Controller('api/medical-records')
export class MedicalRecordsController {
  constructor(private readonly records: MedicalRecordsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create the clinical record for a completed appointment',
  })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @UseGuards(AuthDoctorGuard)
  create(@Req() req: AuthDoctorRequest, @Body() dto: CreateMedicalRecordDto) {
    return this.records.create(req.docId as string, dto);
  }

  @Get('mine')
  @ApiOperation({ summary: "List the authenticated patient's own records" })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @UseGuards(AuthUserGuard)
  mine(@Req() req: AuthUserRequest, @Query() query: QueryMedicalRecordsDto) {
    return this.records.listMine(req.userId as string, query);
  }

  @Get('doctor/mine')
  @ApiOperation({ summary: "List the authenticated doctor's own records" })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @UseGuards(AuthDoctorGuard)
  doctorMine(
    @Req() req: AuthDoctorRequest,
    @Query() query: QueryMedicalRecordsDto,
  ) {
    return this.records.listForDoctor(req.docId as string, query);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Migration/metadata status (never returns clinical content)',
  })
  @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
  @UseGuards(AuthAdminGuard)
  status() {
    return this.records.getStatus();
  }

  @Get('doctor/:id')
  @ApiOperation({ summary: 'Read one record of your own patient (doctor)' })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'id', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthDoctorGuard)
  getForDoctor(@Req() req: AuthDoctorRequest, @Param('id') id: string) {
    return this.records.getForDoctor(req.docId as string, id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read one of your own records (patient)' })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'id', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthUserGuard)
  getForPatient(@Req() req: AuthUserRequest, @Param('id') id: string) {
    return this.records.getForPatient(req.userId as string, id);
  }
}
