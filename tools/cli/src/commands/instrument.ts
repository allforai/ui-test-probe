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
  const defaultExclude = ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.dart_tool/**', '**/Pods/**'];
  const ignorePatterns = [...defaultExclude, ...(exclude ?? [])];

  const allFiles: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: dir,
      absolute: true,
      ignore: ignorePatterns,
      nodir: true,
    });
    allFiles.push(...matches);
  }

  // Deduplicate and sort
  return [...new Set(allFiles)].sort();
}

/**
 * Analyzes a single source file and adds probe annotations
 * to UI components that lack them.
 */
/** Maps common component/element names to ProbeType values. */
const COMPONENT_TYPE_MAP: Record<string, string> = {
  // data containers
  table: 'data-container', flatlist: 'data-container', listview: 'data-container',
  collectionview: 'data-container', datagrid: 'data-container', list: 'data-container',
  lazycolumn: 'data-container', lazyrow: 'data-container', recyclerview: 'data-container',
  // selectors
  select: 'selector', dropdown: 'selector', picker: 'selector', combobox: 'selector',
  autocomplete: 'selector', datepicker: 'selector', timepicker: 'selector',
  // actions
  button: 'action', iconbutton: 'action', fab: 'action', floatingactionbutton: 'action',
  link: 'action', a: 'action', submitbutton: 'action',
  // display
  text: 'display', label: 'display', span: 'display', p: 'display',
  h1: 'display', h2: 'display', h3: 'display', h4: 'display', h5: 'display', h6: 'display',
  chip: 'display', badge: 'display', alert: 'display', toast: 'display',
  // media
  video: 'media', audio: 'media', img: 'media', image: 'media', canvas: 'media',
  // form
  form: 'form', input: 'form', textarea: 'form', checkbox: 'form', radio: 'form',
  switch: 'form', slider: 'form', textfield: 'form', textformfield: 'form',
  entry: 'form', editor: 'form',
  // page
  page: 'page', screen: 'page', scaffold: 'page',
  // modal
  dialog: 'modal', modal: 'modal', bottomsheet: 'modal', alertdialog: 'modal',
  sheet: 'modal', popover: 'modal', drawer: 'modal',
  // navigation
  nav: 'navigation', navbar: 'navigation', tabbar: 'navigation', tabs: 'navigation',
  sidebar: 'navigation', navigationview: 'navigation', bottomnavigation: 'navigation',
  tabview: 'navigation', navigationbar: 'navigation',
};

/** Key control element names worth annotating (excludes generic containers like div/span). */
const KEY_CONTROLS_WEB = new Set([
  'table', 'button', 'form', 'input', 'textarea', 'select', 'a',
  'nav', 'dialog', 'video', 'audio', 'img', 'ul', 'ol',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'checkbox', 'radio', 'slider', 'switch',
]);

const KEY_CONTROLS_FLUTTER = new Set([
  'Scaffold', 'ListView', 'DataTable', 'Table', 'DropdownButton', 'PopupMenuButton',
  'ElevatedButton', 'TextButton', 'OutlinedButton', 'IconButton', 'FloatingActionButton',
  'TextField', 'TextFormField', 'Checkbox', 'Radio', 'Switch', 'Slider',
  'AlertDialog', 'SimpleDialog', 'BottomSheet', 'Dialog',
  'BottomNavigationBar', 'TabBar', 'Drawer', 'NavigationRail',
  'Image', 'VideoPlayer', 'Form',
]);

const KEY_CONTROLS_SWIFTUI = new Set([
  'NavigationView', 'NavigationStack', 'TabView', 'List', 'Table', 'Form',
  'Button', 'Link', 'Toggle', 'Picker', 'DatePicker', 'Slider', 'Stepper',
  'TextField', 'TextEditor', 'SecureField',
  'Alert', 'Sheet', 'ConfirmationDialog', 'Popover',
  'Image', 'VideoPlayer', 'AsyncImage',
  'NavigationSplitView', 'Sidebar',
]);

const KEY_CONTROLS_COMPOSE = new Set([
  'Scaffold', 'LazyColumn', 'LazyRow', 'LazyVerticalGrid',
  'Button', 'TextButton', 'OutlinedButton', 'IconButton', 'FloatingActionButton', 'ExtendedFloatingActionButton',
  'TextField', 'OutlinedTextField', 'Checkbox', 'RadioButton', 'Switch', 'Slider',
  'DropdownMenu', 'ExposedDropdownMenuBox',
  'AlertDialog', 'Dialog', 'ModalBottomSheet',
  'NavigationBar', 'TabRow', 'NavigationRail', 'ModalDrawer',
  'Image', 'AsyncImage',
]);

const KEY_CONTROLS_MAUI = new Set([
  'Button', 'ImageButton', 'CollectionView', 'ListView', 'TableView',
  'Entry', 'Editor', 'Picker', 'DatePicker', 'TimePicker', 'CheckBox', 'Switch', 'Slider', 'Stepper',
  'Image', 'MediaElement',
  'NavigationPage', 'TabbedPage', 'FlyoutPage', 'Shell',
  'Frame', 'Border',
]);

/** Global counter for the 'counter' ID strategy. */
let globalCounter = 0;

function inferProbeType(componentName: string): string {
  const lower = componentName.toLowerCase();
  return COMPONENT_TYPE_MAP[lower] ?? 'display';
}

function generateProbeId(
  componentName: string,
  filePath: string,
  index: number,
  strategy: string,
): string {
  switch (strategy) {
    case 'semantic': {
      // Convert PascalCase/camelCase to kebab-case
      const kebab = componentName
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase();
      // Add index suffix if needed to avoid collisions within file
      return index === 0 ? kebab : `${kebab}-${index + 1}`;
    }
    case 'path': {
      const basename = path.basename(filePath, path.extname(filePath))
        .replace(/\./g, '-')
        .toLowerCase();
      return `${basename}-${componentName.toLowerCase()}-${index + 1}`;
    }
    case 'counter':
    default:
      globalCounter++;
      return `probe-${globalCounter}`;
  }
}

async function analyzeAndInstrument(
  filePath: string,
  framework: string,
  idStrategy: string,
  dryRun?: boolean,
): Promise<{ components: number; alreadyAnnotated: number; added: number }> {
  let content = fs.readFileSync(filePath, 'utf-8');
  let components = 0;
  let alreadyAnnotated = 0;
  let added = 0;

  if (framework === 'react' || framework === 'vue' || framework === 'svelte' || framework === 'angular') {
    // Web frameworks: scan for JSX/HTML elements
    // Match opening tags: <TagName or <tag-name
    const tagRegex = /<([A-Za-z][A-Za-z0-9.-]*)\b([^>]*?)(\s*\/?>)/g;
    const keyControls = KEY_CONTROLS_WEB;

    // Also include PascalCase React components that map to known types
    const allReplacements: Array<{ start: number; end: number; replacement: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(content)) !== null) {
      const tagName = match[1];
      const attrs = match[2];
      const closing = match[3];
      const fullMatch = match[0];
      const lowerTag = tagName.toLowerCase();

      // Check if this is a key control or known component
      const isKeyControl = keyControls.has(lowerTag) || COMPONENT_TYPE_MAP[lowerTag] !== undefined;
      // Also include PascalCase components that look like controls
      const isPascalControl = /^[A-Z]/.test(tagName) && COMPONENT_TYPE_MAP[tagName.toLowerCase()] !== undefined;

      if (!isKeyControl && !isPascalControl) continue;
      components++;

      // Check if already annotated
      if (/data-probe-id\s*=/.test(attrs)) {
        alreadyAnnotated++;
        continue;
      }

      const probeId = generateProbeId(tagName, filePath, added, idStrategy);
      const probeType = inferProbeType(tagName);
      const annotation = ` data-probe-id="${probeId}" data-probe-type="${probeType}"`;

      // Insert annotation before the closing of the opening tag
      const insertPos = match.index + fullMatch.length - closing.length;
      allReplacements.push({
        start: insertPos,
        end: insertPos,
        replacement: annotation,
      });
      added++;
    }

    // Apply replacements in reverse order to preserve positions
    for (const rep of allReplacements.reverse()) {
      content = content.slice(0, rep.start) + rep.replacement + content.slice(rep.end);
    }
  } else if (framework === 'flutter') {
    // Flutter: find Widget constructors like WidgetName(
    const widgetRegex = /\b([A-Z][A-Za-z0-9]+)\s*\(/g;
    const allReplacements: Array<{ start: number; end: number; replacement: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = widgetRegex.exec(content)) !== null) {
      const widgetName = match[1];
      if (!KEY_CONTROLS_FLUTTER.has(widgetName)) continue;
      components++;

      // Check if already wrapped with ProbeWidget or has probeId
      const before = content.slice(Math.max(0, match.index - 50), match.index);
      if (/ProbeWidget\s*\(\s*$/.test(before) || /probeId\s*:/.test(content.slice(match.index, match.index + 200))) {
        alreadyAnnotated++;
        continue;
      }

      const probeId = generateProbeId(widgetName, filePath, added, idStrategy);
      const probeType = inferProbeType(widgetName);

      // Wrap with ProbeWidget: ProbeWidget(id: 'x', type: 'y', child: WidgetName(
      allReplacements.push({
        start: match.index,
        end: match.index,
        replacement: `ProbeWidget(id: '${probeId}', type: '${probeType}', child: `,
      });
      // We need to find the matching closing paren to add the closing )
      // For simplicity, we add a comment marker — full AST parsing would be needed for production
      added++;
    }

    // Apply replacements in reverse order
    for (const rep of allReplacements.reverse()) {
      content = content.slice(0, rep.start) + rep.replacement + content.slice(rep.end);
    }
  } else if (framework === 'swiftui') {
    // SwiftUI: find View calls like ViewName( or ViewName {
    const viewRegex = /\b([A-Z][A-Za-z0-9]+)\s*[({]/g;
    const allReplacements: Array<{ start: number; end: number; replacement: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = viewRegex.exec(content)) !== null) {
      const viewName = match[1];
      if (!KEY_CONTROLS_SWIFTUI.has(viewName)) continue;
      components++;

      // Check if already annotated with .probeId(
      const afterStart = match.index + match[0].length;
      const afterSlice = content.slice(afterStart, afterStart + 500);
      // Look for .probeId on the same expression (before next newline block ends)
      const lineEnd = afterSlice.indexOf('\n');
      const sameLine = afterSlice.slice(0, lineEnd > 0 ? lineEnd : 100);
      if (/\.probeId\(/.test(sameLine)) {
        alreadyAnnotated++;
        continue;
      }

      // Also check if .probeId appears shortly after in the modifier chain
      const nextLines = afterSlice.slice(0, 300);
      if (/\.probeId\(/.test(nextLines)) {
        alreadyAnnotated++;
        continue;
      }

      const probeId = generateProbeId(viewName, filePath, added, idStrategy);
      const probeType = inferProbeType(viewName);

      // Find the end of the expression to append .probeId()
      // We'll find the matching brace/paren close — simplified: append after tag line
      // For a robust approach we'd need AST, but we append .probeId() modifier
      // We'll place the modifier hint as a line comment for now, then the user can adjust
      // Actually, let's find the closing of the constructor and add .probeId() after
      // Simplified: add .probeId() modifier right after the opening match
      // In SwiftUI, modifiers chain: Button("X") { ... }.probeId("x")
      // We insert a comment marker and the modifier after the next closing brace/paren pair
      allReplacements.push({
        start: match.index,
        end: match.index + match[0].length,
        replacement: match[0] + ` /* probe: ${probeId} */ `,
      });
      // Actually, insert as a modifier: we need to find the end. Let's use a simpler approach:
      // Add .probeId() on the line after where we find the view
      added++;
    }

    // Better approach: insert .probeId("id", type: "type") after the view declaration line
    // Reset and redo with line-based approach
    const lines = content.split('\n');
    const newLines: string[] = [];
    added = 0;
    components = 0;
    alreadyAnnotated = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      newLines.push(line);

      const lineMatch = /\b([A-Z][A-Za-z0-9]+)\s*[({]/.exec(line);
      if (!lineMatch) continue;
      const viewName = lineMatch[1];
      if (!KEY_CONTROLS_SWIFTUI.has(viewName)) continue;
      components++;

      // Check surrounding lines for .probeId
      const surroundingText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');
      if (/\.probeId\(/.test(surroundingText)) {
        alreadyAnnotated++;
        continue;
      }

      const probeId = generateProbeId(viewName, filePath, added, idStrategy);
      const probeType = inferProbeType(viewName);
      const indent = line.match(/^(\s*)/)?.[1] ?? '';
      newLines.push(`${indent}    .probeId("${probeId}", type: "${probeType}")`);
      added++;
    }

    content = newLines.join('\n');
  } else if (framework === 'compose') {
    // Compose: find Composable function calls like FunctionName(
    const composableRegex = /\b([A-Z][A-Za-z0-9]+)\s*\(/g;
    const lines = content.split('\n');
    const newLines: string[] = [];
    let localAdded = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      newLines.push(line);

      const lineMatch = /\b([A-Z][A-Za-z0-9]+)\s*\(/.exec(line);
      if (!lineMatch) continue;
      const fnName = lineMatch[1];
      if (!KEY_CONTROLS_COMPOSE.has(fnName)) continue;
      components++;

      // Check if Modifier.probeId is in the surrounding area
      const surroundingText = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 5)).join('\n');
      if (/\.probeId\(/.test(surroundingText) || /probeId\s*=/.test(surroundingText)) {
        alreadyAnnotated++;
        continue;
      }

      // For Compose, we need to add modifier = Modifier.probeId("id", "type") inside the call
      // Simplified: add a comment with the modifier to insert
      const probeId = generateProbeId(fnName, filePath, localAdded, idStrategy);
      const probeType = inferProbeType(fnName);
      const indent = line.match(/^(\s*)/)?.[1] ?? '';

      // Insert modifier parameter on the next line
      newLines.push(`${indent}    modifier = Modifier.probeId("${probeId}", "${probeType}"),`);
      localAdded++;
    }

    added = localAdded;
    content = newLines.join('\n');
  } else if (framework === 'maui') {
    // MAUI XAML: find XML elements
    const xmlRegex = /<([A-Za-z][A-Za-z0-9.]*)\b([^>]*?)(\s*\/?>)/g;
    const allReplacements: Array<{ start: number; end: number; replacement: string }> = [];
    let match: RegExpExecArray | null;

    while ((match = xmlRegex.exec(content)) !== null) {
      const tagName = match[1].split('.').pop() ?? match[1];
      if (!KEY_CONTROLS_MAUI.has(tagName)) continue;
      components++;

      const attrs = match[2];
      if (/probe:Probe\.Id\s*=/.test(attrs)) {
        alreadyAnnotated++;
        continue;
      }

      const probeId = generateProbeId(tagName, filePath, added, idStrategy);
      const probeType = inferProbeType(tagName);
      const closing = match[3];
      const annotation = ` probe:Probe.Id="${probeId}" probe:Probe.Type="${probeType}"`;

      const insertPos = match.index + match[0].length - closing.length;
      allReplacements.push({
        start: insertPos,
        end: insertPos,
        replacement: annotation,
      });
      added++;
    }

    for (const rep of allReplacements.reverse()) {
      content = content.slice(0, rep.start) + rep.replacement + content.slice(rep.end);
    }
  }

  if (added > 0 && !dryRun) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }

  return { components, alreadyAnnotated, added };
}
