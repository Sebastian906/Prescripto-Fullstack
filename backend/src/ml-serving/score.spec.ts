import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  loadArtifact,
  scoreRow,
  type ModelArtifact,
  type ScoreInput,
} from './score';

// Artefacto sintético autocontenido: cubre loadArtifact + scoreRow sin datos
// de pacientes ni registry poblado.
const ARTIFACT: ModelArtifact = {
  modelVersion: 'test-parity',
  trainedAt: '2026-01-01T00:00:00.000Z',
  datasetSha256: 'synthetic',
  holdoutAuc: 0.8,
  threshold: 0.5,
  featureOrder: [
    'timeBand=morning',
    'timeBand=evening',
    'weekday=1',
    'weekday=3',
    'leadTimeDays',
    'priorCount',
    'priorCancelRate',
    'priorNoShowRate',
  ],
  timeBandLevels: ['morning', 'afternoon', 'evening', 'night'],
  scaler: {
    mean: [0, 0, 0, 0, 6, 1, 0.24, 0.24],
    scale: [1, 1, 1, 1, 3, 1.4, 0.24, 0.24],
  },
  coef: [0.8, -0.5, 0.3, -0.2, 0.6, 0.4, -1.1, 0.9],
  intercept: -0.35,
};

const ROW: ScoreInput = {
  timeBand: 'evening',
  weekday: 3,
  leadTimeDays: 4,
  priorCount: 2,
  priorCancelRate: 0.5,
  priorNoShowRate: 0.25,
};

// Calculado con ml/pipeline/check_artifact.py::predict (expit de la stdlib).
const PYTHON_EXPECTED = 0.08960622921985527;

const loadSynthetic = (): ModelArtifact => {
  const path = join(mkdtempSync(join(tmpdir(), 'ml-score-')), 'model.json');
  writeFileSync(path, JSON.stringify(ARTIFACT));
  return loadArtifact(path);
};

describe('scoreRow', () => {
  it('reproduce la probabilidad de la implementación Python', () => {
    expect(scoreRow(loadSynthetic(), ROW)).toBeCloseTo(PYTHON_EXPECTED, 9);
  });

  it('no desborda con z fuera de rango', () => {
    const artifact = loadSynthetic();
    expect(scoreRow(artifact, { ...ROW, priorNoShowRate: 9999 })).toBe(1);
    expect(scoreRow(artifact, { ...ROW, priorCancelRate: 9999 })).toBeLessThan(
      1e-9,
    );
  });
});

const registry = resolve(process.cwd(), '../ml/registry');
const modelPath = resolve(registry, 'model-v0.1.0.json');
const goldenPath = resolve(registry, 'golden.json');

// Antes de entrenar no hay artefacto: el spec no debe romper el repo.
(existsSync(modelPath) && existsSync(goldenPath) ? describe : describe.skip)(
  'paridad TypeScript ↔ sklearn',
  () => {
    it('reproduce la probabilidad de golden.json', () => {
      const artifact = loadArtifact(modelPath);
      const golden = JSON.parse(readFileSync(goldenPath, 'utf8')) as {
        row: ScoreInput;
        expected: number;
      };
      expect(scoreRow(artifact, golden.row)).toBeCloseTo(golden.expected, 6);
    });
  },
);
