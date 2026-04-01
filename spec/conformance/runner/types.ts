/** A single conformance test vector (primitive-level). */
export interface PrimitiveVector {
  id: string;
  name: string;
  action: { method: string; args?: unknown[] };
  expect: Expectation;
}

/** A multi-step scenario vector. */
export interface ScenarioVector {
  id: string;
  name: string;
  precondition?: string;
  steps: ScenarioStep[];
}

export interface ScenarioStep {
  action?: string;
  args?: unknown[];
  save_as?: string;
  assert?: string;
  expect?: Expectation;
  timeout_ms?: number;
}

export interface Expectation {
  not_null?: boolean;
  is_null?: boolean;
  is_true?: boolean;
  is_false?: boolean;
  fields?: Record<string, unknown | ComparisonOp>;
}

export interface ComparisonOp {
  gt?: number;
  lt?: number;
  gte?: number;
  lte?: number;
  contains?: string;
  has_length?: number;
  matches?: string;
}

export interface VectorResult {
  vector_id: string;
  status: 'pass' | 'fail' | 'skip' | 'error';
  duration_ms: number;
  actual?: unknown;
  expected?: unknown;
  error?: string;
}

export interface PlatformResult {
  platform: string;
  runner_version: string;
  vectors_file: string;
  timestamp: string;
  results: VectorResult[];
}

export interface CrossPlatformReport {
  generated_at: string;
  tool_version: string;
  platforms_tested: string[];
  platforms_skipped: Array<{ platform: string; reason: string }>;
  conformance: {
    vectors_total: number;
    results_by_platform: Record<string, { passed: number; failed: number; skipped: number }>;
    failures: Array<{
      vector_id: string;
      platform: string;
      name: string;
      expected: string;
      actual: string;
      severity: 'critical' | 'major' | 'minor';
    }>;
  };
  equivalence_matrix: Record<string, Record<string, string>>;
  overall_status: 'pass' | 'partial' | 'fail';
}
