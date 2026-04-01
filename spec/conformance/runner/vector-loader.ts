import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import type { PrimitiveVector, ScenarioVector } from './types';

export interface VectorFile {
  category: string;
  vectors: Array<PrimitiveVector | ScenarioVector>;
}

export function loadVectors(vectorDir: string): VectorFile[] {
  const files = readdirSync(vectorDir).filter(f => f.endsWith('.json'));
  return files.map(f => {
    const content = readFileSync(join(vectorDir, f), 'utf-8');
    return JSON.parse(content) as VectorFile;
  });
}

export function isScenario(v: PrimitiveVector | ScenarioVector): v is ScenarioVector {
  return 'steps' in v;
}
