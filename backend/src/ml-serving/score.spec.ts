import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadArtifact, scoreRow, type ScoreInput } from './score';

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
