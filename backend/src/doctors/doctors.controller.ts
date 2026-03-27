import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DoctorsService } from './doctors.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { LoginDoctorDto } from './dto/login-doctor.dto';

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
}
