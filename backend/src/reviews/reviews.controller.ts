import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import { AuthUserGuard } from 'src/shared/guards/auth-user.guard';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

interface AuthUserRequest extends Request {
  userId?: string;
}

interface AuthDoctorRequest extends Request {
  docId?: string;
}

@ApiTags('Reviews')
@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a review for a completed appointment' })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @UseGuards(AuthUserGuard)
  create(@Req() req: AuthUserRequest, @Body() dto: CreateReviewDto) {
    return this.reviews.create(req.userId as string, dto);
  }

  @Get('appointment/:appointmentId')
  @ApiOperation({ summary: 'Get your review for an appointment' })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'appointmentId', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthUserGuard)
  getByAppointment(
    @Req() req: AuthUserRequest,
    @Param('appointmentId') appointmentId: string,
  ) {
    return this.reviews.getByAppointment(req.userId as string, appointmentId);
  }

  @Get('doctor/mine')
  @ApiOperation({ summary: 'Get reviews for the authenticated doctor' })
  @ApiHeader({
    name: 'dtoken',
    description: 'Doctor JWT authentication token',
    required: true,
  })
  @UseGuards(AuthDoctorGuard)
  getDoctorReviews(@Req() req: AuthDoctorRequest) {
    return this.reviews.getDoctorReviews(req.docId as string);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit your review within the 7-day window' })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'id', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthUserGuard)
  update(
    @Req() req: AuthUserRequest,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviews.update(req.userId as string, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your review within the 7-day window' })
  @ApiHeader({
    name: 'token',
    description: 'Patient JWT authentication token',
    required: true,
  })
  @ApiParam({ name: 'id', example: '64f1a2b3c4d5e6f7a8b9c0d1' })
  @UseGuards(AuthUserGuard)
  remove(@Req() req: AuthUserRequest, @Param('id') id: string) {
    return this.reviews.remove(req.userId as string, id);
  }
}
