import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { LoginDoctorDto } from './dto/login-doctor.dto';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { CompleteAppointmentDto } from './dto/complete-appointment.dto';

@ApiTags('Doctors')
@Controller('api/doctors')
export class DoctorsController {
    constructor(private readonly doctorsService: DoctorsService) {}

    @Patch('change-availability/:id')
    @ApiOperation({ summary: 'Toggle doctor availability' })
    @ApiHeader({
        name: 'atoken',
        description: 'Admin authentication token',
        required: true,
    })
    @UseGuards(AuthAdminGuard)
    async changeAvailability(@Param('id') id: string) {
        return this.doctorsService.changeAvailability(id)
    }

    @Get('list')
    @ApiOperation({ summary: 'Get list of doctors' })
    async getDoctorsList() {
        return this.doctorsService.doctorList();
    }

    @Post('login')
    @ApiOperation({ summary: 'Doctor login' })
    async loginDoctor(@Body() body: LoginDoctorDto) {
        return this.doctorsService.loginDoctor(body);
    }

    @Get('appointments')
    @ApiOperation({ summary: 'Get all appointments for the authenticated doctor' })
    @ApiHeader({
        name: 'dtoken',
        description: 'Doctor authentication token',
        required: true,
    })
    @UseGuards(AuthDoctorGuard)
    async getDoctorAppointments(@Req() req: Request) {
        const docId = (req as any).docId as string;
        return this.doctorsService.getDoctorAppointments(docId);
    }

    @Patch('complete-appointment')
    @ApiOperation({ summary: 'Mark an appointment as completed (doctor panel)' })
    @ApiHeader({
        name: 'dtoken',
        description: 'Doctor authentication token',
        required: true,
    })
    @UseGuards(AuthDoctorGuard)
    async completeAppointment(
        @Req() req: Request,
        @Body() dto: CompleteAppointmentDto,
    ) {
        const docId = (req as any).docId as string;
        return this.doctorsService.completeAppointment(docId, dto.appointmentId);
    }

    @Patch('cancel-appointment')
    @ApiOperation({ summary: 'Cancel an appointment (doctor panel)' })
    @ApiHeader({
        name: 'dtoken',
        description: 'Doctor authentication token',
        required: true,
    })
    @UseGuards(AuthDoctorGuard)
    async cancelAppointmentDoctor(
        @Req() req: Request,
        @Body() dto: CancelAppointmentDto,
    ) {
        const docId = (req as any).docId as string;
        return this.doctorsService.cancelAppointmentDoctor(docId, dto.appointmentId);
    }
}
