import { readFileSync } from 'node:fs';

// Contrato espejo de ml/registry/model-v0.1.0.json (exportado por 03_export.py).
export interface ModelArtifact {
  modelVersion: string;
  trainedAt: string;
  sklearnVersion?: string;
  datasetSha256: string;
  holdoutAuc: number;
  threshold: number;
  featureOrder: string[];
  timeBandLevels: string[];
  scaler: { mean: number[]; scale: number[] };
  coef: number[];
  intercept: number;
}

export function loadArtifact(path: string): ModelArtifact {
  const artifact = JSON.parse(readFileSync(path, 'utf8')) as ModelArtifact;
  const size = artifact.featureOrder.length;
  if (
    size === 0 ||
    artifact.coef.length !== size ||
    artifact.scaler.mean.length !== size ||
    artifact.scaler.scale.length !== size
  ) {
    throw new Error(
      'artefacto inconsistente: featureOrder/coef/scaler no cuadran',
    );
  }
  return artifact;
}

export interface ScoreInput {
  timeBand: string;
  weekday: number;
  leadTimeDays: number;
  priorCount: number;
  priorCancelRate: number;
  priorNoShowRate: number;
}

function rawValue(
  artifact: ModelArtifact,
  name: string,
  input: ScoreInput,
): number {
  if (name.startsWith('timeBand='))
    return name === `timeBand=${input.timeBand}` ? 1 : 0;
  if (name.startsWith('weekday='))
    return name === `weekday=${input.weekday}` ? 1 : 0;
  if (name === 'leadTimeDays') return input.leadTimeDays;
  if (name === 'priorCount') return input.priorCount;
  if (name === 'priorCancelRate') return input.priorCancelRate;
  if (name === 'priorNoShowRate') return input.priorNoShowRate;
  throw new Error(`feature desconocida en el artefacto: ${name}`);
}

/**
 * Espejo exacto de pipeline/check_artifact.py::predict. El orden de columnas lo
 * dicta `featureOrder`; si divergen, score.spec.ts falla contra golden.json.
 */
export function scoreRow(artifact: ModelArtifact, input: ScoreInput): number {
  let z = artifact.intercept;
  artifact.featureOrder.forEach((name, index) => {
    const scaled =
      (rawValue(artifact, name, input) - artifact.scaler.mean[index]) /
      artifact.scaler.scale[index];
    z += artifact.coef[index] * scaled;
  });
  return 1 / (1 + Math.exp(-z));
}
