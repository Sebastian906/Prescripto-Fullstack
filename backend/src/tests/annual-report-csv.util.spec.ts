import {
    ANNUAL_CSV_COLUMNS,
    annualReportToCsv,
} from './annual-report-csv.util';
import type { AnnualReportRow } from '../reports.service';

const row = (over: Partial<AnnualReportRow>): AnnualReportRow => ({
    month: 1,
    monthLabel: 'Jan',
    totalAppointments: 0,
    completedAppointments: 0,
    cancelledAppointments: 0,
    earnings: 0,
    uniquePatients: 0,
    cumulativeEarnings: 0,
    cumulativeAppointments: 0,
    ...over,
});

describe('annualReportToCsv', () => {
    it('emite header estable y sin uniquePatientIds', () => {
        const csv = annualReportToCsv([]);
        const [header] = csv.replace(/^\uFEFF/, '').split('\r\n');
        expect(header).toBe(ANNUAL_CSV_COLUMNS.join(','));
        expect(header).toBe(
            'month,monthLabel,totalAppointments,completedAppointments,cancelledAppointments,earnings,uniquePatients,cumulativeEarnings',
        );
        expect(csv).not.toContain('uniquePatientIds');
    });

    it('serializa 2 filas con escapado RFC 4180', () => {
        const csv = annualReportToCsv([
            row({ month: 1, monthLabel: 'Jan', totalAppointments: 10, completedAppointments: 7, cancelledAppointments: 1, earnings: 1500, uniquePatients: 9, cumulativeEarnings: 1500 }),
            row({ month: 2, monthLabel: 'Feb "alta", norte', totalAppointments: 5, completedAppointments: 5, cancelledAppointments: 0, earnings: 800, uniquePatients: 5, cumulativeEarnings: 2300 }),
        ]);
        const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
        expect(lines[1]).toBe('1,Jan,10,7,1,1500,9,1500');
        expect(lines[2]).toBe('2,"Feb ""alta"", norte",5,5,0,800,5,2300');
    });
});