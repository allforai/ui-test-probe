/**
 * instrument command — scans source files, identifies UI components,
 * and adds data-probe-* annotations (or platform-equivalent).
 *
 * Supports multiple frameworks:
 *   - react/vue/svelte/angular: data-probe-id, data-probe-type, etc.
 *   - maui: probe:Probe.Id, probe:Probe.Type attached properties
 *   - flutter: ProbeWidget wrapper
 *   - swiftui: .probeId() modifier
 *   - compose: Modifier.probeId()
 */

import { glob } from 'glob';
import * as fs from 'fs';
import * as path from 'path';

/** Framework-specific file patterns */
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

/** Options passed from CLI argument parsing. */
interface InstrumentOptions {
  framework: string;
  dir: string;
  dryRun?: boolean;
  include?: string[];
  exclude?: string[];
  idStrategy: string;
}

/**
 * Scans source files for UI components and adds probe annotations.
 * In dry-run mode, prints what would be changed without writing files.
 *
 * @param options - CLI options from commander.
 */
export async function instrumentCommand(options: InstrumentOptions): Promise<void> {
  const { framework, dir, dryRun, include, exclude, idStrategy } = options;
  const sourceDir = path.resolve(dir);

  console.log(`Scanning ${sourceDir} for ${framework} components...`);
  if (dryRun) {
    console.log('(dry run — no files will be modified)\n');
  }

  // Determine file patterns
  const patterns = include ?? FRAMEWORK_PATTERNS[framework];
  if (!patterns) {
    console.error(`Unknown framework: ${framework}`);
    process.exit(1);
  }

  // Find matching source files
  const files = await findSourceFiles(sourceDir, patterns, exclude);
  console.log(`Found ${files.length} source file(s)\n`);

  let totalComponents = 0;
  let totalAnnotated = 0;
  let totalAdded = 0;

  for (const file of files) {
    const result = await analyzeAndInstrument(file, framework, idStrategy, dryRun);
    totalComponents += result.components;
    totalAnnotated += result.alreadyAnnotated;
    totalAdded += result.added;

    if (result.added > 0) {
      console.log(`  ${path.relative(sourceDir, file)}: +${result.added} annotations`);
    }
  }

  console.log(`\nSummary:`);
  console.log(`  Components found:      ${totalComponents}`);
  console.log(`  Already annotated:     ${totalAnnotated}`);
  console.log(`  Annotations added:     ${totalAdded}`);
  console.log(`  Components remaining:  ${totalComponents - totalAnnotated - totalAdded}`);
}

/**
 * Finds source files matching the given glob patterns.
 */
async function findSourceFiles(
  dir: string,
  patterns: string[],
  exclude?: string[],
): Promise<string[]> {
  // TODO: Use glob to find files matching patterns in dir.
  //       Apply exclude patterns. Return sorted file paths.
  throw new Error('findSourceFiles: not yet implemented');
}

/**
 * Analyzes a single source file and adds probe annotations
 * to UI components that lack them.
 */
async function analyzeAndInstrument(
  filePath: string,
  framework: string,
  idStrategy: string,
  dryRun?: boolean,
): Promise<{ components: number; alreadyAnnotated: number; added: number }> {
  // TODO: 1. Read file contents
  //       2. Parse/scan for UI component declarations based on framework:
  //          - React: JSX elements (<Button>, <FlatList>, <View>, etc.)
  //          - Vue: <template> elements with interactive roles
  //          - MAUI: XAML elements (Button, CollectionView, Picker, etc.)
  //          - Flutter: Widget constructors
  //          - SwiftUI: View body expressions
  //          - Compose: Composable function calls
  //       3. For each component, check if it already has a probe annotation
  //       4. If not, generate a probe ID based on idStrategy:
  //          - semantic: derive from component name + context (e.g., "order-table")
  //          - path: derive from file path + component position
  //          - counter: sequential numbering
  //       5. Infer probe type from component type
  //       6. Insert annotation in framework-appropriate syntax
  //       7. If not dryRun, write modified file
  //       8. Return counts
  throw new Error('analyzeAndInstrument: not yet implemented');
}
