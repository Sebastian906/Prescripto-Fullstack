import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { PaymentsService } from './payments.service';

@ApiTags('Payments')
@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':appointmentId')
  @ApiOperation({ summary: 'Read the auditable payment row (admin only)' })
  @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
  @UseGuards(AuthAdminGuard)
  async getByAppointment(@Param('appointmentId') appointmentId: string) {
    const payment =
      await this.paymentsService.getStatusForAppointment(appointmentId);
    if (!payment) throw new NotFoundException('Payment not found');
    return { success: true, payment };
  }

  @Post(':appointmentId/refund')
  @ApiOperation({ summary: 'Refund a paid appointment payment (admin only)' })
  @ApiHeader({ name: 'atoken', description: 'Admin token', required: true })
  @UseGuards(AuthAdminGuard)
  async refund(
    @Param('appointmentId') appointmentId: string,
    @Body() dto: RefundPaymentDto,
  ) {
    const payment = await this.paymentsService.refund(
      appointmentId,
      dto?.amount,
    );
    return { success: true, payment };
  }
}
