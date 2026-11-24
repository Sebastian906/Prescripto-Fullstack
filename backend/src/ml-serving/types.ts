export type TimeBand = 'morning' | 'afternoon' | 'evening' | 'night';

export type DatasetSource = 'mongo' | 'synthetic';

// Fila de entrenamiento: solo IDs pseudonimizados y bandas. Cero PHI.
export interface FeatureRow {
  appointmentId: string;
  patientKey: string;
  timeBand: TimeBand;
  weekday: number;
  leadTimeDays: number;
  priorCount: number;
  priorCancelRate: number;
  priorNoShowRate: number;
  label: 0 | 1;
}

// Contrato con ml/pipeline/02_train.py (archivo hermano del JSONL).
export interface DatasetManifest {
  version: string;
  sha256: string;
  nRows: number;
  droppedRows: number;
  labelRate: number;
  createdAt: string;
  source: DatasetSource;
  includeSynthetic: boolean;
  consentFilter: true;
  consentCoverage: number;
  notes: string[];
}
