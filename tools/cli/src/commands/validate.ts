/**
 * validate command — reads annotated source files and checks for
 * completeness: missing source bindings, missing linkage targets,
 * orphan IDs, duplicate IDs, type mismatches, etc.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

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
/** Framework-specific file patterns (shared with instrument command). */
const FRAMEWORK_PATTERNS: Record<string, string[]> = {
  react: ['**/*.tsx', '**/*.jsx'],
  vue: ['**/*.vue'],
  svelte: ['**/*.svelte'],
  angular: ['**/*.component.html', '**/*.component.ts'],
  maui: ['**/*.xaml', '**/*.xaml.cs'],
  flutter: ['**/*.dart'],
  swiftui: ['**/*.swift'],
  compose: ['**/*.kt'],
};

/** Valid ProbeType values (from spec). */
const VALID_PROBE_TYPES = new Set([
  'data-container', 'selector', 'action', 'display', 'media',
  'form', 'page', 'modal', 'navigation',
]);

/** Probe types that are interactive and should have state bindings. */
const INTERACTIVE_TYPES = new Set([
  'action', 'selector', 'form', 'modal', 'navigation',
]);

/** Parsed annotation from a source file. */
interface ParsedAnnotation {
  probeId: string;
  probeType?: string;
  probeState?: string;
  probeSource?: string;
  probeLinkage?: string[];
  probeParent?: string;
  file: string;
  line: number;
}

/**
 * Finds source files matching patterns.
 */
async function findSourceFiles(
  dir: string,
  patterns: string[],
  exclude?: string[],
): Promise<string[]> {
  const defaultExclude = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.dart_tool/**', '**/Pods/**'];
  const ignorePatterns = [...defaultExclude, ...(exclude ?? [])];
  const allFiles: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, { cwd: dir, absolute: true, ignore: ignorePatterns, nodir: true });
    allFiles.push(...matches);
  }
  return [...new Set(allFiles)].sort();
}

/**
 * Extracts probe annotations from a source file based on framework.
 */
function extractAnnotations(filePath: string, content: string, framework: string): ParsedAnnotation[] {
  const annotations: ParsedAnnotation[] = [];
  const lines = content.split('\n');

  if (framework === 'react' || framework === 'vue' || framework === 'svelte' || framework === 'angular') {
    // Web: scan for data-probe-id attributes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = /data-probe-id\s*=\s*["']([^"']+)["']/.exec(line);
      if (!idMatch) continue;

      const typeMatch = /data-probe-type\s*=\s*["']([^"']+)["']/.exec(line);
      const stateMatch = /data-probe-state\s*=\s*["']([^"']+)["']/.exec(line);
      const sourceMatch = /data-probe-source\s*=\s*["']([^"']+)["']/.exec(line);
      const linkageMatch = /data-probe-linkage\s*=\s*["']([^"']+)["']/.exec(line);
      const parentMatch = /data-probe-parent\s*=\s*["']([^"']+)["']/.exec(line);

      annotations.push({
        probeId: idMatch[1],
        probeType: typeMatch?.[1],
        probeState: stateMatch?.[1],
        probeSource: sourceMatch?.[1],
        probeLinkage: linkageMatch?.[1]?.split(',').map((s) => s.trim()),
        probeParent: parentMatch?.[1],
        file: filePath,
        line: i + 1,
      });
    }
  } else if (framework === 'flutter') {
    // Flutter: scan for ProbeWidget(id: 'x' or probeId: 'x'
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = /(?:ProbeWidget\s*\(\s*id\s*:\s*|probeId\s*:\s*)['"]([^'"]+)['"]/.exec(line);
      if (!idMatch) continue;

      const typeMatch = /type\s*:\s*['"]([^'"]+)['"]/.exec(line);
      annotations.push({
        probeId: idMatch[1],
        probeType: typeMatch?.[1],
        file: filePath,
        line: i + 1,
      });
    }
  } else if (framework === 'swiftui') {
    // SwiftUI: scan for .probeId("x"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = /\.probeId\(\s*["']([^"']+)["']/.exec(line);
      if (!idMatch) continue;

      const typeMatch = /type\s*:\s*["']([^"']+)["']/.exec(line);
      annotations.push({
        probeId: idMatch[1],
        probeType: typeMatch?.[1],
        file: filePath,
        line: i + 1,
      });
    }
  } else if (framework === 'compose') {
    // Compose: scan for Modifier.probeId("x"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = /\.probeId\(\s*["']([^"']+)["']/.exec(line);
      if (!idMatch) continue;

      const typeMatch = /["']([^"']+)["']\s*[,)]/.exec(line.slice(line.indexOf(idMatch[1]) + idMatch[1].length));
      annotations.push({
        probeId: idMatch[1],
        probeType: typeMatch?.[1],
        file: filePath,
        line: i + 1,
      });
    }
  } else if (framework === 'maui') {
    // MAUI: scan for probe:Probe.Id="x"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const idMatch = /probe:Probe\.Id\s*=\s*["']([^"']+)["']/.exec(line);
      if (!idMatch) continue;

      const typeMatch = /probe:Probe\.Type\s*=\s*["']([^"']+)["']/.exec(line);
      annotations.push({
        probeId: idMatch[1],
        probeType: typeMatch?.[1],
        file: filePath,
        line: i + 1,
      });
    }
  }

  return annotations;
}

async function runValidation(
  sourceDir: string,
  framework: string,
  include?: string[],
  exclude?: string[],
): Promise<Finding[]> {
  const findings: Finding[] = [];

  // 1. Find source files
  const patterns = include ?? FRAMEWORK_PATTERNS[framework];
  if (!patterns) {
    findings.push({
      severity: 'error',
      code: 'PROBE_UNKNOWN_FRAMEWORK',
      message: `Unknown framework: ${framework}`,
      file: sourceDir,
    });
    return findings;
  }

  const files = await findSourceFiles(sourceDir, patterns, exclude);

  // 2. Extract all annotations and build registry
  const allAnnotations: ParsedAnnotation[] = [];
  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const annotations = extractAnnotations(file, content, framework);
    allAnnotations.push(...annotations);
  }

  // Build ID -> annotation(s) map
  const idMap = new Map<string, ParsedAnnotation[]>();
  for (const ann of allAnnotations) {
    const existing = idMap.get(ann.probeId) ?? [];
    existing.push(ann);
    idMap.set(ann.probeId, existing);
  }

  const declaredIds = new Set(idMap.keys());

  // 3. Run checks

  // PROBE_DUPLICATE_ID
  for (const [id, anns] of idMap) {
    if (anns.length > 1) {
      for (const ann of anns) {
        findings.push({
          severity: 'error',
          code: 'PROBE_DUPLICATE_ID',
          message: `Duplicate probe ID "${id}" — declared ${anns.length} times`,
          file: path.relative(sourceDir, ann.file),
          line: ann.line,
          probeId: id,
        });
      }
    }
  }

  // PROBE_MISSING_TYPE
  for (const ann of allAnnotations) {
    if (!ann.probeType) {
      findings.push({
        severity: 'error',
        code: 'PROBE_MISSING_TYPE',
        message: `Probe ID "${ann.probeId}" has no type annotation`,
        file: path.relative(sourceDir, ann.file),
        line: ann.line,
        probeId: ann.probeId,
      });
    }
  }

  // PROBE_INVALID_TYPE
  for (const ann of allAnnotations) {
    if (ann.probeType && !VALID_PROBE_TYPES.has(ann.probeType)) {
      findings.push({
        severity: 'error',
        code: 'PROBE_INVALID_TYPE',
        message: `Probe type "${ann.probeType}" is not a valid ProbeType (valid: ${[...VALID_PROBE_TYPES].join(', ')})`,
        file: path.relative(sourceDir, ann.file),
        line: ann.line,
        probeId: ann.probeId,
      });
    }
  }

  // PROBE_MISSING_SOURCE — data-container without source binding
  for (const ann of allAnnotations) {
    if (ann.probeType === 'data-container' && !ann.probeSource) {
      findings.push({
        severity: 'warning',
        code: 'PROBE_MISSING_SOURCE',
        message: `data-container "${ann.probeId}" has no source binding (data-probe-source)`,
        file: path.relative(sourceDir, ann.file),
        line: ann.line,
        probeId: ann.probeId,
      });
    }
  }

  // PROBE_MISSING_STATE — interactive elements without state
  for (const ann of allAnnotations) {
    if (ann.probeType && INTERACTIVE_TYPES.has(ann.probeType) && !ann.probeState) {
      findings.push({
        severity: 'warning',
        code: 'PROBE_MISSING_STATE',
        message: `Interactive element "${ann.probeId}" (type: ${ann.probeType}) has no state binding`,
        file: path.relative(sourceDir, ann.file),
        line: ann.line,
        probeId: ann.probeId,
      });
    }
  }

  // PROBE_ORPHAN_LINKAGE — linkage target ID not found
  for (const ann of allAnnotations) {
    if (!ann.probeLinkage) continue;
    for (const targetId of ann.probeLinkage) {
      if (!declaredIds.has(targetId)) {
        findings.push({
          severity: 'error',
          code: 'PROBE_ORPHAN_LINKAGE',
          message: `Linkage target "${targetId}" referenced by "${ann.probeId}" does not exist`,
          file: path.relative(sourceDir, ann.file),
          line: ann.line,
          probeId: ann.probeId,
        });
      }
    }
  }

  // PROBE_CIRCULAR_LINKAGE — detect cycles in linkage graph
  const linkageGraph = new Map<string, string[]>();
  for (const ann of allAnnotations) {
    if (ann.probeLinkage && ann.probeLinkage.length > 0) {
      linkageGraph.set(ann.probeId, ann.probeLinkage);
    }
  }

  function detectCycle(startId: string): string[] | null {
    const visited = new Set<string>();
    const path: string[] = [];

    function dfs(id: string): boolean {
      if (path.includes(id)) {
        return true; // cycle found
      }
      if (visited.has(id)) return false;
      visited.add(id);
      path.push(id);

      const targets = linkageGraph.get(id) ?? [];
      for (const target of targets) {
        if (dfs(target)) return true;
      }
      path.pop();
      return false;
    }

    dfs(startId);
    if (path.length > 0) {
      return path;
    }
    return null;
  }

  const reportedCycles = new Set<string>();
  for (const id of linkageGraph.keys()) {
    const cycle = detectCycle(id);
    if (cycle && cycle.length > 0) {
      const cycleKey = [...cycle].sort().join(',');
      if (!reportedCycles.has(cycleKey)) {
        reportedCycles.add(cycleKey);
        const ann = allAnnotations.find((a) => a.probeId === id)!;
        findings.push({
          severity: 'error',
          code: 'PROBE_CIRCULAR_LINKAGE',
          message: `Circular linkage detected: ${cycle.join(' -> ')} -> ${cycle[0]}`,
          file: path.relative(sourceDir, ann.file),
          line: ann.line,
          probeId: id,
        });
      }
    }
  }

  // PROBE_UNREACHABLE — element with no parent path to page root
  const pageIds = new Set(
    allAnnotations.filter((a) => a.probeType === 'page').map((a) => a.probeId),
  );
  const childToParent = new Map<string, string>();
  for (const ann of allAnnotations) {
    if (ann.probeParent) {
      childToParent.set(ann.probeId, ann.probeParent);
    }
  }

  // Only check reachability if there are page elements and parent relationships declared
  if (pageIds.size > 0 && childToParent.size > 0) {
    for (const ann of allAnnotations) {
      if (ann.probeType === 'page') continue; // pages are roots
      if (!childToParent.has(ann.probeId)) {
        // No parent declared — could be unreachable
        findings.push({
          severity: 'info',
          code: 'PROBE_UNREACHABLE',
          message: `Element "${ann.probeId}" has no parent path to a page root`,
          file: path.relative(sourceDir, ann.file),
          line: ann.line,
          probeId: ann.probeId,
        });
        continue;
      }

      // Walk up parent chain to see if we reach a page
      let current = ann.probeId;
      const seen = new Set<string>();
      let reachesPage = false;
      while (current && !seen.has(current)) {
        seen.add(current);
        if (pageIds.has(current)) {
          reachesPage = true;
          break;
        }
        current = childToParent.get(current) ?? '';
      }

      if (!reachesPage) {
        findings.push({
          severity: 'info',
          code: 'PROBE_UNREACHABLE',
          message: `Element "${ann.probeId}" has no parent path to a page root`,
          file: path.relative(sourceDir, ann.file),
          line: ann.line,
          probeId: ann.probeId,
        });
      }
    }
  }

  // 4. Sort findings by severity (error > warning > info)
  const severityOrder: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings;
}
