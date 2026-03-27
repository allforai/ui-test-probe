#!/usr/bin/env node

/**
 * @allforai/ui-test-probe-cli
 *
 * CLI tool for managing UI Test Probe annotations across codebases.
 * Three commands:
 *   - instrument: scan source files and add data-probe-* annotations
 *   - validate:   check annotations for completeness and consistency
 *   - report:     generate observability coverage report
 */

import { Command } from 'commander';
import { instrumentCommand } from './commands/instrument';
import { validateCommand } from './commands/validate';
import { reportCommand } from './commands/report';

const program = new Command();

program
  .name('ui-test-probe')
  .description('UI Test Probe CLI — instrument, validate, and report on probe annotations')
  .version('0.1.0');

program
  .command('instrument')
  .description('Scan source files and add probe annotations to UI components')
  .option('-f, --framework <type>', 'Target framework (react|vue|svelte|angular|maui|flutter|swiftui|compose)', 'react')
  .option('-d, --dir <path>', 'Source directory to scan', './src')
  .option('--dry-run', 'Show what would be changed without modifying files')
  .option('--include <patterns...>', 'Glob patterns to include (e.g., "**/*.tsx")')
  .option('--exclude <patterns...>', 'Glob patterns to exclude (e.g., "node_modules/**")')
  .option('--id-strategy <strategy>', 'ID generation strategy (semantic|path|counter)', 'semantic')
  .action(instrumentCommand);

program
  .command('validate')
  .description('Check probe annotations for completeness and consistency')
  .option('-d, --dir <path>', 'Source directory to scan', './src')
  .option('-f, --framework <type>', 'Target framework', 'react')
  .option('--strict', 'Treat warnings as errors (non-zero exit code)')
  .option('--include <patterns...>', 'Glob patterns to include')
  .option('--exclude <patterns...>', 'Glob patterns to exclude')
  .action(validateCommand);

program
  .command('report')
  .description('Generate observability coverage report')
  .option('-d, --dir <path>', 'Source directory to scan', './src')
  .option('-f, --framework <type>', 'Target framework', 'react')
  .option('-o, --output <path>', 'Output file path (default: stdout)')
  .option('--format <type>', 'Output format (text|json|html)', 'text')
  .option('--include <patterns...>', 'Glob patterns to include')
  .option('--exclude <patterns...>', 'Glob patterns to exclude')
  .action(reportCommand);

program.parse();
