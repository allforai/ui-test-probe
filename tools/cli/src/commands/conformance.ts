import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ConformanceOptions {
  platform: string[];
  vectorDir: string;
  json?: boolean;
  output?: string;
}

interface PlatformTestResult {
  platform: string;
  status: 'pass' | 'fail' | 'skip';
  passed: number;
  failed: number;
  total: number;
  error?: string;
}

function detectToolchains(): Record<string, boolean> {
  const check = (cmd: string): boolean => {
    try { execSync(cmd, { stdio: 'ignore' }); return true; } catch { return false; }
  };
  return {
    web: check('node --version'),
    flutter: check('flutter --version'),
    ios: check('swift --version'),
    android: check('gradle --version'),
    windows: check('dotnet --version'),
  };
}

function runPlatform(platform: string, vectorDir: string, projectRoot: string): PlatformTestResult {
  try {
    switch (platform) {
      case 'web': {
        const runnerDir = path.join(projectRoot, 'spec/conformance/runner');
        if (!fs.existsSync(path.join(runnerDir, 'web-runner.ts'))) {
          return { platform, status: 'skip', passed: 0, failed: 0, total: 0, error: 'Web runner not found' };
        }
        const result = execSync(`cd "${runnerDir}" && npx vitest run web-runner.spec.ts 2>&1`, { encoding: 'utf-8', timeout: 120000 });
        const passMatch = result.match(/(\d+) passed/);
        const failMatch = result.match(/(\d+) failed/);
        const passed = passMatch ? parseInt(passMatch[1]) : 0;
        const failed = failMatch ? parseInt(failMatch[1]) : 0;
        return { platform, status: failed > 0 ? 'fail' : 'pass', passed, failed, total: passed + failed };
      }
      case 'flutter': {
        const runnerDir = path.join(projectRoot, 'spec/conformance/flutter-runner');
        if (!fs.existsSync(runnerDir)) {
          return { platform, status: 'skip', passed: 0, failed: 0, total: 0, error: 'Flutter runner not found' };
        }
        execSync(`cd "${runnerDir}" && flutter test 2>&1`, { encoding: 'utf-8', timeout: 120000 });
        return { platform, status: 'pass', passed: 1, failed: 0, total: 1 };
      }
      default:
        return { platform, status: 'skip', passed: 0, failed: 0, total: 0, error: `No runner for ${platform}` };
    }
  } catch (err: any) {
    const msg = err.stdout || err.stderr || err.message || String(err);
    return { platform, status: 'fail', passed: 0, failed: 1, total: 1, error: String(msg).slice(0, 300) };
  }
}

export function conformanceCommand(options: ConformanceOptions): void {
  const projectRoot = process.cwd();
  const toolchains = detectToolchains();

  const platforms = options.platform.length > 0
    ? options.platform
    : Object.keys(toolchains).filter(k => toolchains[k]);

  if (!options.json) console.log(`Running conformance on: ${platforms.join(', ')}\n`);

  const results: PlatformTestResult[] = [];
  for (const platform of platforms) {
    if (!toolchains[platform]) {
      results.push({ platform, status: 'skip', passed: 0, failed: 0, total: 0, error: 'toolchain not available' });
      continue;
    }
    if (!options.json) process.stdout.write(`  Testing ${platform}...`);
    const result = runPlatform(platform, options.vectorDir, projectRoot);
    results.push(result);
    if (!options.json) console.log(` ${result.status} (${result.passed}/${result.total})`);
  }

  const report = {
    generated_at: new Date().toISOString(),
    tool_version: '0.1.0',
    platforms_tested: results.filter(r => r.status !== 'skip').map(r => r.platform),
    platforms_skipped: results.filter(r => r.status === 'skip').map(r => ({ platform: r.platform, reason: r.error ?? 'unknown' })),
    results,
    overall_status: results.every(r => r.status === 'pass' || r.status === 'skip') ? 'pass' : 'fail',
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log('\n=== Cross-Platform Conformance Report ===\n');
    for (const r of results) {
      const icon = r.status === 'pass' ? '✓' : r.status === 'skip' ? '—' : '✗';
      console.log(`  ${icon} ${r.platform}: ${r.status} (${r.passed}/${r.total})`);
      if (r.error && r.status !== 'pass') console.log(`    ${r.error}`);
    }
    console.log(`\nOverall: ${report.overall_status}`);
  }

  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(path.resolve(options.output), JSON.stringify(report, null, 2));
    if (!options.json) console.log(`\nReport saved to ${options.output}`);
  }
}
