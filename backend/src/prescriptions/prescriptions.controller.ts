import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { QueryPrescriptionsDto } from './dto/query-prescriptions.dto';
import { PrescriptionsService } from './prescriptions.service';

interface AuthDoctorRequest extends Request {
  docId?: string;
}

interface AuthUserRequest extends Request {
  userId?: string;
}

const prescriptionPipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: { enableImplicitConversion: true },
});

@ApiTags('Prescriptions')
@Controller('api/prescriptions')
@UsePipes(prescriptionPipe)
export class PrescriptionsController {
  constructor(private readonly prescriptions: PrescriptionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Issue a prescription for one of your own medical records',
  })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @UseGuards(AuthDoctorGuard)
  create(@Req() req: AuthDoctorRequest, @Body() dto: CreatePrescriptionDto) {
    return this.prescriptions.create(req.docId as string, dto);
  }

  @Get('mine')
  @ApiOperation({
    summary: "List the authenticated patient's own prescriptions",
  })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @UseGuards(AuthUserGuard)
  mine(@Req() req: AuthUserRequest, @Query() query: QueryPrescriptionsDto) {
    return this.prescriptions.listMine(req.userId as string, query);
  }

  @Get('doctor/mine')
  @ApiOperation({
    summary: "List the authenticated doctor's issued prescriptions",
  })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @UseGuards(AuthDoctorGuard)
  doctorMine(
    @Req() req: AuthDoctorRequest,
    @Query() query: QueryPrescriptionsDto,
  ) {
    return this.prescriptions.listForDoctor(req.docId as string, query);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Prescription metadata status (never returns clinical content)',
  })
  @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
  @UseGuards(AuthAdminGuard)
  status() {
    return this.prescriptions.getStatus();
  }

  @Get('doctor/:id')
  @ApiOperation({ summary: 'Read one prescription issued by you (doctor)' })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'id', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthDoctorGuard)
  getForDoctor(@Req() req: AuthDoctorRequest, @Param('id') id: string) {
    return this.prescriptions.getForDoctor(req.docId as string, id);
  }

  @Patch(':id/revoke')
  @ApiOperation({
    summary: 'Revoke a prescription (sets revokedAt; never deletes)',
  })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'id', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthDoctorGuard)
  revoke(@Req() req: AuthDoctorRequest, @Param('id') id: string) {
    return this.prescriptions.revoke(req.docId as string, id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Read one of your own prescriptions (patient, printable)',
  })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'id', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthUserGuard)
  getForPatient(@Req() req: AuthUserRequest, @Param('id') id: string) {
    return this.prescriptions.getForPatient(req.userId as string, id);
  }
}
