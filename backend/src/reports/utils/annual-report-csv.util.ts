import type { AnnualReportRow } from '../reports.service';

// Orden de columnas fijo — contrato "header estable". No reordenar sin test.
export const ANNUAL_CSV_COLUMNS = [
  'month',
  'monthLabel',
  'totalAppointments',
  'completedAppointments',
  'cancelledAppointments',
  'earnings',
  'uniquePatients',
  'cumulativeEarnings',
] as const;

export type AnnualCsvColumn = (typeof ANNUAL_CSV_COLUMNS)[number];

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const s = typeof value === 'string' ? value : String(value);
  if (
    s.includes('"') ||
    s.includes(',') ||
    s.includes('\n') ||
    s.includes('\r')
  ) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Solo agregados — nunca incluir uniquePatientIds aquí.
export function annualReportToCsv(rows: AnnualReportRow[]): string {
  const header = ANNUAL_CSV_COLUMNS.join(',');
  const lines = rows.map((r) =>
    ANNUAL_CSV_COLUMNS.map((c) => escapeCsvCell(r[c])).join(','),
  );
  // BOM para Excel (ñ/acentos) + CRLF para Excel Windows
  return '\uFEFF' + [header, ...lines].join('\r\n') + '\r\n';
}
