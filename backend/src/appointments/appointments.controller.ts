import { Body, Controller, Get, Headers, Patch, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { PaymentCODDto } from './dto/payment-cod.dto';
import { PaymentStripeDto } from './dto/payment-stripe.dto';

@ApiTags('Appointments')
@Controller('api/appointments')
export class AppointmentsController {
    constructor(private readonly appointmentService: AppointmentsService) { }

    @Post('book-appointment')
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

    @Get('user-appointments')
    @ApiOperation({ summary: 'Get all appointments for the authenticated user' })
    @ApiHeader({
        name: 'token',
        description: 'User JWT authentication token',
        required: true,
    })
    @UseGuards(AuthUserGuard)
    async getUserAppointments(@Req() req: Request) {
        const userId = (req as any).userId as string;
        return this.appointmentService.getUserAppointments(userId);
    }

    @Patch('cancel-appointment')
    @ApiOperation({ summary: 'Cancel an appointment' })
    @ApiHeader({
        name: 'token',
        description: 'User JWT authentication token',
        required: true,
    })
    @UseGuards(AuthUserGuard)
    async cancelAppointment(
        @Req() req: Request,
        @Body() dto: CancelAppointmentDto,
    ) {
        const userId = (req as any).userId as string;
        return this.appointmentService.cancelAppointment(userId, dto);
    }

    @Patch('payment-cod')
    @ApiOperation({ summary: 'Mark appointment as paid via Cash on Delivery' })
    @ApiHeader({ name: 'token', description: 'User JWT authentication token', required: true })
    @UseGuards(AuthUserGuard)
    async payWithCOD(
        @Req() req: Request,
        @Body() dto: PaymentCODDto,
    ) {
        const userId = (req as any).userId as string;
        return this.appointmentService.payWithCOD(userId, dto);
    }

    @Post('payment-stripe')
    @ApiOperation({ summary: 'Create a Stripe Checkout session for an appointment' })
    @ApiHeader({ name: 'token', description: 'User JWT authentication token', required: true })
    @UseGuards(AuthUserGuard)
    async payWithStripe(
        @Req() req: Request,
        @Body() dto: PaymentStripeDto,
    ) {
        const userId = (req as any).userId as string;
        return this.appointmentService.payWithStripe(userId, dto);
    }

    @Post('stripe-webhook')
    @ApiOperation({ summary: 'Stripe webhook to confirm payment' })
    async stripeWebhook(
        @Req() req: any,
        @Headers('stripe-signature') signature: string,
    ) {
        return this.appointmentService.verifyStripePayment(req.rawBody, signature);
    }
}
