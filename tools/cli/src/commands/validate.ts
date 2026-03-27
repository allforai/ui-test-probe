/**
 * validate command — reads annotated source files and checks for
 * completeness: missing source bindings, missing linkage targets,
 * orphan IDs, duplicate IDs, type mismatches, etc.
 */

import * as path from 'path';

/** Severity levels for validation findings. */
type Severity = 'error' | 'warning' | 'info';

/** A single validation finding. */
interface Finding {
  severity: Severity;
  code: string;
  message: string;
  file: string;
  line?: number;
  probeId?: string;
}

/** Options passed from CLI argument parsing. */
interface ValidateOptions {
  dir: string;
  framework: string;
  strict?: boolean;
  include?: string[];
  exclude?: string[];
}

/**
 * Validates probe annotations for completeness and consistency.
 * Checks for:
 *   - Missing source bindings on data-container elements
 *   - Linkage targets that don't exist as probe IDs
 *   - Orphan probe IDs (referenced in linkage but never declared)
 *   - Duplicate probe IDs within the same scope
 *   - Type mismatches (e.g., linkage target on a non-existent element)
 *   - Missing required annotations on interactive controls
 *
 * @param options - CLI options from commander.
 */
export async function validateCommand(options: ValidateOptions): Promise<void> {
  const { dir, framework, strict } = options;
  const sourceDir = path.resolve(dir);

  console.log(`Validating probe annotations in ${sourceDir} (${framework})...\n`);

  const findings = await runValidation(sourceDir, framework, options.include, options.exclude);

  // Group by severity
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const infos = findings.filter((f) => f.severity === 'info');

  // Print findings
  for (const finding of findings) {
    const prefix = finding.severity === 'error' ? 'ERROR' : finding.severity === 'warning' ? 'WARN' : 'INFO';
    const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    const probeRef = finding.probeId ? ` [${finding.probeId}]` : '';
    console.log(`  ${prefix}  ${finding.code}  ${location}${probeRef}`);
    console.log(`         ${finding.message}`);
  }

  console.log(`\nResults: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`);

  // Exit code
  if (errors.length > 0 || (strict && warnings.length > 0)) {
    process.exit(1);
  }
}

/**
 * Runs all validation checks and returns findings.
 */
async function runValidation(
  sourceDir: string,
  framework: string,
  include?: string[],
  exclude?: string[],
): Promise<Finding[]> {
  // TODO: 1. Scan source files for probe annotations (same file discovery as instrument)
  //       2. Build a registry of all declared probe IDs with their metadata
  //       3. Run checks:
  //
  //          PROBE_DUPLICATE_ID: same probe ID declared in multiple places
  //          PROBE_MISSING_SOURCE: data-container without source binding
  //          PROBE_ORPHAN_LINKAGE: linkage target references a non-existent probe ID
  //          PROBE_MISSING_TYPE: annotation has id but no type
  //          PROBE_INVALID_TYPE: type value not in ProbeType enum
  //          PROBE_MISSING_STATE: interactive control without state binding
  //          PROBE_CIRCULAR_LINKAGE: linkage chain forms a cycle
  //          PROBE_UNREACHABLE: probe ID declared but never referenced in tests
  //
  //       4. Return findings sorted by severity (error > warning > info)
  throw new Error('runValidation: not yet implemented');
}
