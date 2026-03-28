import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { LoginDoctorDto } from './dto/login-doctor.dto';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';

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
}
