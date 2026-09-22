import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService, GLOBAL_DOC_ID } from './reports.service';
import { AuthAdminGuard } from 'src/shared/guards/auth-admin.guard';
import { AuthDoctorGuard } from 'src/shared/guards/auth-doctor.guard';
import { annualReportToCsv } from './utils/annual-report-csv.util';

@ApiTags('Reports')
@Controller('api/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Reporte anual — Admin: puede consultar cualquier doctor o el sistema global.
   * O(1): lee máximo 12 documentos de MonthlyStats, sin tocar Appointments.
   * ?format=csv devuelve CSV normalizado (agregados, sin uniquePatientIds).
   */
  @Get('annual')
  @ApiOperation({
    summary: 'Get annual DP report (admin — global or per doctor)',
  })
  @ApiHeader({ name: 'atoken', required: true })
  @ApiQuery({ name: 'year', required: true })
  @ApiQuery({ name: 'docId', required: false })
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'json'] })
  @UseGuards(AuthAdminGuard)
  async getAnnualAdmin(
    @Query('year') year: string,
    @Query('docId') docId?: string,
    @Query('format') format?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const data = await this.reportsService.getAnnualReport(
      docId ?? GLOBAL_DOC_ID,
      Number(year),
    );
    if ((format ?? '').toLowerCase() === 'csv') {
      if (!res) return data;
      const csv = annualReportToCsv(data.report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="annual-report-${Number(year)}.csv"`,
      );
      res.send(csv);
      return;
    }
    return data;
  }

  // Reporte anual — Doctor: sólo sus propias métricas.
  @Get('doctor/annual')
  @ApiOperation({ summary: 'Get annual DP report (doctor panel)' })
  @ApiHeader({ name: 'dtoken', required: true })
  @ApiQuery({ name: 'year', required: true })
  @UseGuards(AuthDoctorGuard)
  async getAnnualDoctor(@Req() req: Request, @Query('year') year: string) {
    const docId = (req as any).docId as string;
    return this.reportsService.getAnnualReport(docId, Number(year));
  }

  // Tendencia rolling — Admin.
  @Get('trend')
  @ApiOperation({ summary: 'Get monthly trend (admin)' })
  @ApiHeader({ name: 'atoken', required: true })
  @ApiQuery({ name: 'months', required: false })
  @ApiQuery({ name: 'docId', required: false })
  @UseGuards(AuthAdminGuard)
  async getTrendAdmin(
    @Query('months') months?: string,
    @Query('docId') docId?: string,
  ) {
    return this.reportsService.getMonthlyTrend(
      docId ?? GLOBAL_DOC_ID,
      months ? Number(months) : 12,
    );
  }

  // Tendencia rolling — Doctor.
  @Get('doctor/trend')
  @ApiOperation({ summary: 'Get monthly trend (doctor panel)' })
  @ApiHeader({ name: 'dtoken', required: true })
  @ApiQuery({ name: 'months', required: false })
  @UseGuards(AuthDoctorGuard)
  async getTrendDoctor(@Req() req: Request, @Query('months') months?: string) {
    const docId = (req as any).docId as string;
    return this.reportsService.getMonthlyTrend(
      docId,
      months ? Number(months) : 12,
    );
  }
}
