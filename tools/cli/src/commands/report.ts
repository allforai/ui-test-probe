/**
 * report command — generates observability coverage report.
 * Answers: how many controls are annotated, what percentage of pages
 * are covered, which annotations are missing, and coverage by type.
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

/** Per-page coverage summary. */
interface PageCoverage {
  /** Page file path (relative to source dir) */
  file: string;
  /** Probe ID of the page element, if annotated */
  pageProbeId?: string;
  /** Total interactive controls found */
  totalControls: number;
  /** Controls with probe annotations */
  annotatedControls: number;
  /** Coverage percentage (0-100) */
  coveragePercent: number;
  /** Controls missing annotations */
  missingAnnotations: string[];
}

/** Overall coverage report. */
interface CoverageReport {
  /** Report generation timestamp */
  timestamp: string;
  /** Framework detected/specified */
  framework: string;
  /** Source directory scanned */
  sourceDir: string;
  /** Total pages/screens found */
  totalPages: number;
  /** Pages with at least one probe annotation */
  annotatedPages: number;
  /** Total interactive controls across all pages */
  totalControls: number;
  /** Controls with probe annotations */
  annotatedControls: number;
  /** Overall coverage percentage */
  overallCoveragePercent: number;
  /** Coverage breakdown by ProbeType */
  coverageByType: Record<string, { total: number; annotated: number; percent: number }>;
  /** Per-page coverage details */
  pages: PageCoverage[];
}

/** Options passed from CLI argument parsing. */
interface ReportOptions {
  dir: string;
  framework: string;
  output?: string;
  format: string;
  include?: string[];
  exclude?: string[];
}

/**
 * Generates an observability coverage report showing how many controls
 * are annotated, coverage percentage by page and by type, and lists
 * of missing annotations.
 *
 * @param options - CLI options from commander.
 */
export async function reportCommand(options: ReportOptions): Promise<void> {
  const { dir, framework, output, format } = options;
  const sourceDir = path.resolve(dir);

  console.log(`Generating coverage report for ${sourceDir} (${framework})...\n`);

  const report = await generateReport(sourceDir, framework, options.include, options.exclude);

  // Format output
  let formatted: string;
  switch (format) {
    case 'json':
      formatted = JSON.stringify(report, null, 2);
      break;
    case 'html':
      formatted = formatHtml(report);
      break;
    case 'text':
    default:
      formatted = formatText(report);
      break;
  }

  // Write or print
  if (output) {
    fs.writeFileSync(path.resolve(output), formatted, 'utf-8');
    console.log(`Report written to ${output}`);
  } else {
    console.log(formatted);
  }
}

/**
 * Scans source files and generates coverage report data.
 */
/** Framework-specific file patterns. */
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

/** Valid ProbeType values. */
const VALID_PROBE_TYPES = [
  'data-container', 'selector', 'action', 'display', 'media',
  'form', 'page', 'modal', 'navigation',
];

/** Key control tag/component names for web frameworks. */
const KEY_CONTROLS_WEB = new Set([
  'table', 'button', 'form', 'input', 'textarea', 'select', 'a',
  'nav', 'dialog', 'video', 'audio', 'img', 'ul', 'ol',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

/** Maps component names to probe types (simplified). */
const COMPONENT_TYPE_MAP: Record<string, string> = {
  table: 'data-container', ul: 'data-container', ol: 'data-container',
  select: 'selector',
  button: 'action', a: 'action',
  h1: 'display', h2: 'display', h3: 'display', h4: 'display', h5: 'display', h6: 'display',
  video: 'media', audio: 'media', img: 'media',
  form: 'form', input: 'form', textarea: 'form',
  dialog: 'modal',
  nav: 'navigation',
};

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

/** Info about a detected control in a file. */
interface DetectedControl {
  name: string;
  inferredType: string;
  isAnnotated: boolean;
  line: number;
}

/**
 * Scans a file for controls and annotations.
 */
function scanFile(filePath: string, content: string, framework: string): DetectedControl[] {
  const controls: DetectedControl[] = [];
  const lines = content.split('\n');

  if (framework === 'react' || framework === 'vue' || framework === 'svelte' || framework === 'angular') {
    const tagRegex = /<([A-Za-z][A-Za-z0-9.-]*)\b([^>]*?)(\s*\/?>)/g;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(content)) !== null) {
      const tagName = match[1];
      const lowerTag = tagName.toLowerCase();
      const attrs = match[2];

      const isKeyControl = KEY_CONTROLS_WEB.has(lowerTag) || COMPONENT_TYPE_MAP[lowerTag] !== undefined;
      const isPascalControl = /^[A-Z]/.test(tagName) && COMPONENT_TYPE_MAP[tagName.toLowerCase()] !== undefined;
      if (!isKeyControl && !isPascalControl) continue;

      // Calculate line number
      const beforeMatch = content.slice(0, match.index);
      const lineNum = beforeMatch.split('\n').length;

      const isAnnotated = /data-probe-id\s*=/.test(attrs);
      const inferredType = COMPONENT_TYPE_MAP[lowerTag] ?? 'display';

      controls.push({ name: tagName, inferredType, isAnnotated, line: lineNum });
    }
  } else if (framework === 'flutter') {
    for (let i = 0; i < lines.length; i++) {
      const widgetMatch = /\b([A-Z][A-Za-z0-9]+)\s*\(/.exec(lines[i]);
      if (!widgetMatch) continue;
      const name = widgetMatch[1];
      // Check known flutter widgets
      const knownWidgets = new Set([
        'Scaffold', 'ListView', 'DataTable', 'Table', 'DropdownButton', 'PopupMenuButton',
        'ElevatedButton', 'TextButton', 'OutlinedButton', 'IconButton', 'FloatingActionButton',
        'TextField', 'TextFormField', 'Checkbox', 'Radio', 'Switch', 'Slider',
        'AlertDialog', 'SimpleDialog', 'BottomSheet', 'Dialog',
        'BottomNavigationBar', 'TabBar', 'Drawer', 'NavigationRail',
        'Image', 'VideoPlayer', 'Form',
      ]);
      if (!knownWidgets.has(name)) continue;

      const surroundingText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');
      const isAnnotated = /ProbeWidget\s*\(/.test(surroundingText) || /probeId\s*:/.test(surroundingText);
      controls.push({ name, inferredType: 'display', isAnnotated, line: i + 1 });
    }
  } else if (framework === 'swiftui') {
    for (let i = 0; i < lines.length; i++) {
      const viewMatch = /\b([A-Z][A-Za-z0-9]+)\s*[({]/.exec(lines[i]);
      if (!viewMatch) continue;
      const name = viewMatch[1];
      const knownViews = new Set([
        'NavigationView', 'NavigationStack', 'TabView', 'List', 'Table', 'Form',
        'Button', 'Link', 'Toggle', 'Picker', 'DatePicker', 'Slider', 'Stepper',
        'TextField', 'TextEditor', 'SecureField',
        'Alert', 'Sheet', 'ConfirmationDialog', 'Popover',
        'Image', 'VideoPlayer', 'AsyncImage',
      ]);
      if (!knownViews.has(name)) continue;

      const surroundingText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');
      const isAnnotated = /\.probeId\(/.test(surroundingText);
      controls.push({ name, inferredType: 'display', isAnnotated, line: i + 1 });
    }
  } else if (framework === 'compose') {
    for (let i = 0; i < lines.length; i++) {
      const fnMatch = /\b([A-Z][A-Za-z0-9]+)\s*\(/.exec(lines[i]);
      if (!fnMatch) continue;
      const name = fnMatch[1];
      const knownComposables = new Set([
        'Scaffold', 'LazyColumn', 'LazyRow', 'LazyVerticalGrid',
        'Button', 'TextButton', 'OutlinedButton', 'IconButton', 'FloatingActionButton',
        'TextField', 'OutlinedTextField', 'Checkbox', 'RadioButton', 'Switch', 'Slider',
        'DropdownMenu', 'ExposedDropdownMenuBox',
        'AlertDialog', 'Dialog', 'ModalBottomSheet',
        'NavigationBar', 'TabRow', 'NavigationRail', 'ModalDrawer',
      ]);
      if (!knownComposables.has(name)) continue;

      const surroundingText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');
      const isAnnotated = /\.probeId\(/.test(surroundingText) || /probeId\s*=/.test(surroundingText);
      controls.push({ name, inferredType: 'display', isAnnotated, line: i + 1 });
    }
  } else if (framework === 'maui') {
    const xmlRegex = /<([A-Za-z][A-Za-z0-9.]*)\b([^>]*?)(\s*\/?>)/g;
    let match: RegExpExecArray | null;
    const knownElements = new Set([
      'Button', 'ImageButton', 'CollectionView', 'ListView', 'TableView',
      'Entry', 'Editor', 'Picker', 'DatePicker', 'TimePicker', 'CheckBox', 'Switch', 'Slider', 'Stepper',
      'Image', 'MediaElement',
      'NavigationPage', 'TabbedPage', 'FlyoutPage', 'Shell',
    ]);

    while ((match = xmlRegex.exec(content)) !== null) {
      const tagName = match[1].split('.').pop() ?? match[1];
      if (!knownElements.has(tagName)) continue;
      const attrs = match[2];
      const beforeMatch = content.slice(0, match.index);
      const lineNum = beforeMatch.split('\n').length;
      const isAnnotated = /probe:Probe\.Id\s*=/.test(attrs);
      controls.push({ name: tagName, inferredType: 'display', isAnnotated, line: lineNum });
    }
  }

  return controls;
}

/**
 * Checks if a file looks like a page/screen component.
 */
function isPageFile(filePath: string, content: string, framework: string): boolean {
  const lower = filePath.toLowerCase();
  // Heuristic: file name contains page, screen, view, or route
  if (/(?:page|screen|view|route|layout)\b/.test(lower)) return true;

  // Check for page-type annotations
  if (framework === 'react' || framework === 'vue' || framework === 'svelte' || framework === 'angular') {
    return /data-probe-type\s*=\s*["']page["']/.test(content);
  }
  if (framework === 'flutter') {
    return /Scaffold\s*\(/.test(content);
  }
  if (framework === 'swiftui') {
    return /NavigationView|NavigationStack/.test(content);
  }
  if (framework === 'compose') {
    return /Scaffold\s*\(/.test(content);
  }
  return false;
}

async function generateReport(
  sourceDir: string,
  framework: string,
  include?: string[],
  exclude?: string[],
): Promise<CoverageReport> {
  const patterns = include ?? FRAMEWORK_PATTERNS[framework];
  if (!patterns) {
    return {
      timestamp: new Date().toISOString(),
      framework,
      sourceDir,
      totalPages: 0,
      annotatedPages: 0,
      totalControls: 0,
      annotatedControls: 0,
      overallCoveragePercent: 0,
      coverageByType: {},
      pages: [],
    };
  }

  const files = await findSourceFiles(sourceDir, patterns, exclude);

  const pages: PageCoverage[] = [];
  let totalControls = 0;
  let annotatedControls = 0;
  let totalPages = 0;
  let annotatedPages = 0;

  const coverageByType: Record<string, { total: number; annotated: number; percent: number }> = {};
  // Initialize all probe types
  for (const pt of VALID_PROBE_TYPES) {
    coverageByType[pt] = { total: 0, annotated: 0, percent: 0 };
  }

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8');
    const controls = scanFile(file, content, framework);
    const relFile = path.relative(sourceDir, file);

    const isPage = isPageFile(file, content, framework);
    if (isPage) totalPages++;

    const fileTotal = controls.length;
    const fileAnnotated = controls.filter((c) => c.isAnnotated).length;
    const fileMissing = controls.filter((c) => !c.isAnnotated).map((c) => `${c.name} (line ${c.line})`);

    totalControls += fileTotal;
    annotatedControls += fileAnnotated;

    // Update type-level coverage
    for (const control of controls) {
      const inferredType = control.inferredType;
      if (coverageByType[inferredType]) {
        coverageByType[inferredType].total++;
        if (control.isAnnotated) {
          coverageByType[inferredType].annotated++;
        }
      }
    }

    if (fileTotal > 0 || isPage) {
      // Check for page-level probe ID
      const pageIdMatch = /data-probe-id\s*=\s*["']([^"']+)["']/.exec(content);
      const hasAnnotation = fileAnnotated > 0;
      if (isPage && hasAnnotation) annotatedPages++;

      pages.push({
        file: relFile,
        pageProbeId: isPage ? pageIdMatch?.[1] : undefined,
        totalControls: fileTotal,
        annotatedControls: fileAnnotated,
        coveragePercent: fileTotal > 0 ? Math.round((fileAnnotated / fileTotal) * 100 * 10) / 10 : 0,
        missingAnnotations: fileMissing,
      });
    }
  }

  // Compute type percentages
  for (const stats of Object.values(coverageByType)) {
    stats.percent = stats.total > 0 ? Math.round((stats.annotated / stats.total) * 100 * 10) / 10 : 0;
  }

  // Remove types with zero total
  for (const [key, stats] of Object.entries(coverageByType)) {
    if (stats.total === 0) delete coverageByType[key];
  }

  return {
    timestamp: new Date().toISOString(),
    framework,
    sourceDir,
    totalPages,
    annotatedPages,
    totalControls,
    annotatedControls,
    overallCoveragePercent: totalControls > 0 ? Math.round((annotatedControls / totalControls) * 100 * 10) / 10 : 0,
    coverageByType,
    pages,
  };
}

/**
 * Formats the coverage report as human-readable text.
 */
function formatText(report: CoverageReport): string {
  const lines: string[] = [];
  lines.push('=== UI Test Probe Coverage Report ===');
  lines.push(`Framework: ${report.framework}`);
  lines.push(`Source:    ${report.sourceDir}`);
  lines.push(`Time:      ${report.timestamp}`);
  lines.push('');
  lines.push(`Pages:     ${report.annotatedPages}/${report.totalPages} (${((report.annotatedPages / report.totalPages) * 100 || 0).toFixed(1)}%)`);
  lines.push(`Controls:  ${report.annotatedControls}/${report.totalControls} (${report.overallCoveragePercent.toFixed(1)}%)`);
  lines.push('');
  lines.push('Coverage by type:');
  for (const [type, stats] of Object.entries(report.coverageByType)) {
    lines.push(`  ${type.padEnd(20)} ${stats.annotated}/${stats.total} (${stats.percent.toFixed(1)}%)`);
  }
  lines.push('');
  lines.push('Per-page breakdown:');
  for (const page of report.pages) {
    const bar = page.coveragePercent >= 80 ? 'OK' : page.coveragePercent >= 50 ? 'PARTIAL' : 'LOW';
    lines.push(`  ${page.file.padEnd(40)} ${page.annotatedControls}/${page.totalControls} [${bar}]`);
    for (const missing of page.missingAnnotations) {
      lines.push(`    - missing: ${missing}`);
    }
  }
  return lines.join('\n');
}

/**
 * Formats the coverage report as an HTML document.
 */
function formatHtml(report: CoverageReport): string {
  const overallColor = report.overallCoveragePercent >= 80 ? '#22c55e' : report.overallCoveragePercent >= 50 ? '#eab308' : '#ef4444';

  const typeRows = Object.entries(report.coverageByType)
    .map(([type, stats]) => {
      const color = stats.percent >= 80 ? '#22c55e' : stats.percent >= 50 ? '#eab308' : '#ef4444';
      return `
        <tr>
          <td>${type}</td>
          <td>${stats.annotated}/${stats.total}</td>
          <td>
            <div class="bar-container">
              <div class="bar" style="width: ${stats.percent}%; background: ${color};"></div>
            </div>
          </td>
          <td>${stats.percent.toFixed(1)}%</td>
        </tr>`;
    })
    .join('\n');

  const pageRows = report.pages
    .map((page, idx) => {
      const color = page.coveragePercent >= 80 ? '#22c55e' : page.coveragePercent >= 50 ? '#eab308' : '#ef4444';
      const missingHtml = page.missingAnnotations.length > 0
        ? `<details>
            <summary>${page.missingAnnotations.length} missing</summary>
            <ul>${page.missingAnnotations.map((m) => `<li>${escapeHtml(m)}</li>`).join('')}</ul>
          </details>`
        : '<span style="color: #22c55e;">All annotated</span>';
      return `
        <tr>
          <td>${escapeHtml(page.file)}</td>
          <td>${page.pageProbeId ? escapeHtml(page.pageProbeId) : '-'}</td>
          <td>${page.annotatedControls}/${page.totalControls}</td>
          <td>
            <div class="bar-container">
              <div class="bar" style="width: ${page.coveragePercent}%; background: ${color};"></div>
            </div>
          </td>
          <td>${page.coveragePercent.toFixed(1)}%</td>
          <td>${missingHtml}</td>
        </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>UI Test Probe Coverage Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #1e293b; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .card { background: #fff; border-radius: 8px; padding: 1.25rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card .label { font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
    .card .value { font-size: 2rem; font-weight: 700; margin-top: 0.25rem; }
    .card .sub { font-size: 0.875rem; color: #94a3b8; }
    h2 { font-size: 1.125rem; margin: 1.5rem 0 0.75rem; }
    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 2rem; }
    th, td { padding: 0.625rem 0.75rem; text-align: left; border-bottom: 1px solid #e2e8f0; font-size: 0.875rem; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .bar-container { width: 100px; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
    .bar { height: 100%; border-radius: 4px; transition: width 0.3s; }
    details summary { cursor: pointer; color: #ef4444; font-size: 0.8rem; }
    details ul { margin: 0.25rem 0 0 1rem; font-size: 0.8rem; color: #64748b; }
    .footer { text-align: center; color: #94a3b8; font-size: 0.75rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <h1>UI Test Probe Coverage Report</h1>
    <div class="meta">
      Framework: <strong>${escapeHtml(report.framework)}</strong> |
      Source: <strong>${escapeHtml(report.sourceDir)}</strong> |
      Generated: ${escapeHtml(report.timestamp)}
    </div>

    <div class="summary">
      <div class="card">
        <div class="label">Overall Coverage</div>
        <div class="value" style="color: ${overallColor};">${report.overallCoveragePercent.toFixed(1)}%</div>
        <div class="sub">${report.annotatedControls} of ${report.totalControls} controls</div>
      </div>
      <div class="card">
        <div class="label">Pages</div>
        <div class="value">${report.annotatedPages}/${report.totalPages}</div>
        <div class="sub">pages with annotations</div>
      </div>
      <div class="card">
        <div class="label">Annotated Controls</div>
        <div class="value">${report.annotatedControls}</div>
        <div class="sub">of ${report.totalControls} total</div>
      </div>
      <div class="card">
        <div class="label">Missing</div>
        <div class="value" style="color: ${report.totalControls - report.annotatedControls > 0 ? '#ef4444' : '#22c55e'};">${report.totalControls - report.annotatedControls}</div>
        <div class="sub">controls without annotations</div>
      </div>
    </div>

    <h2>Coverage by Type</h2>
    <table>
      <thead>
        <tr><th>Probe Type</th><th>Count</th><th>Coverage</th><th>%</th></tr>
      </thead>
      <tbody>
        ${typeRows}
      </tbody>
    </table>

    <h2>Per-File Breakdown</h2>
    <table>
      <thead>
        <tr><th>File</th><th>Page ID</th><th>Count</th><th>Coverage</th><th>%</th><th>Missing</th></tr>
      </thead>
      <tbody>
        ${pageRows}
      </tbody>
    </table>

    <div class="footer">
      Generated by <strong>@allforai/ui-test-probe-cli</strong>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
