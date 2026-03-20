import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { BookAppointmentDto } from './dto/book-appointment.dto';

@ApiTags('Appointments')
@Controller('api/appointments')
export class AppointmentsController {
    constructor(private readonly appointmentService: AppointmentsService) { }

    @Post('book')
    @ApiOperation({ summary: 'Book a medical appointment' })
    @ApiHeader({
        name: 'token',
        description: 'User JWT authentication token',
        required: true,
    })
    @UseGuards(AuthUserGuard)
    async bookAppointment(
        @Req() req: Request,
        @Body() dto: BookAppointmentDto,
    ) {
        const userId = (req as any).userId as string;
        return this.appointmentService.bookAppointment(userId, dto);
    }
}
