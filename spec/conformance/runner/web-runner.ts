import type { Page } from 'playwright';
import type {
  PrimitiveVector,
  ScenarioVector,
  ScenarioStep,
  VectorResult,
  PlatformResult,
} from './types';
import { evaluateExpectation } from './assertion-engine';
import { loadVectors, isScenario } from './vector-loader';

/**
 * WebConformanceRunner — executes JSON test vectors against a Playwright page
 * with `window.__probe__` injected.
 */
export class WebConformanceRunner {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Load all vector files from `vectorDir`, execute each, return a PlatformResult.
   */
  async runAll(vectorDir: string): Promise<PlatformResult> {
    const vectorFiles = loadVectors(vectorDir);
    const results: VectorResult[] = [];

    for (const file of vectorFiles) {
      for (const vector of file.vectors) {
        if (isScenario(vector)) {
          results.push(await this.runScenario(vector));
        } else {
          results.push(await this.runPrimitive(vector));
        }
      }
    }

    return {
      platform: 'web',
      runner_version: '0.1.0',
      vectors_file: vectorDir,
      timestamp: new Date().toISOString(),
      results,
    };
  }

  /**
   * Execute a single primitive vector: call one method, evaluate expectation.
   */
  async runPrimitive(vector: PrimitiveVector): Promise<VectorResult> {
    const start = Date.now();
    try {
      const actual = await this.executeMethod(
        vector.action.method,
        vector.action.args ?? [],
        (vector.action as Record<string, unknown>).waitFor as Record<string, unknown> | undefined,
      );
      const passed = evaluateExpectation(actual, vector.expect);
      return {
        vector_id: vector.id,
        status: passed ? 'pass' : 'fail',
        duration_ms: Date.now() - start,
        actual,
        expected: vector.expect,
      };
    } catch (err) {
      return {
        vector_id: vector.id,
        status: 'error',
        duration_ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Execute a multi-step scenario vector.
   */
  async runScenario(vector: ScenarioVector): Promise<VectorResult> {
    const start = Date.now();
    const snapshots: Record<string, unknown> = {};

    try {
      // Handle precondition
      if (vector.precondition === 'waitForPageReady') {
        await this.executeMethod('waitForPageReady', [10000]);
      }

      for (const step of vector.steps) {
        await this.executeStep(step, snapshots);
      }

      return {
        vector_id: vector.id,
        status: 'pass',
        duration_ms: Date.now() - start,
      };
    } catch (err) {
      return {
        vector_id: vector.id,
        status: err instanceof AssertionError ? 'fail' : 'error',
        duration_ms: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Execute a single scenario step.
   */
  private async executeStep(
    step: ScenarioStep,
    snapshots: Record<string, unknown>,
  ): Promise<void> {
    if (step.assert) {
      // Assertion step
      if (step.assert === 'snapshots_differ') {
        const args = step.args as string[];
        const a = snapshots[args[0]];
        const b = snapshots[args[1]];
        const differ = JSON.stringify(a) !== JSON.stringify(b);
        if (step.expect) {
          const passed = evaluateExpectation(differ, step.expect);
          if (!passed) {
            throw new AssertionError(
              `Assertion failed for snapshots_differ: expected ${JSON.stringify(step.expect)}, got ${differ}`,
            );
          }
        }
      } else if (step.assert === 'query' || step.assert === 'verifyLinkage') {
        const result = await this.executeMethod(step.assert, step.args ?? []);
        if (step.expect) {
          const passed = evaluateExpectation(result, step.expect);
          if (!passed) {
            throw new AssertionError(
              `Assertion failed for ${step.assert}(${JSON.stringify(step.args)}): ` +
              `expected ${JSON.stringify(step.expect)}, got ${JSON.stringify(result)}`,
            );
          }
        }
      } else {
        // Generic assert — call as method
        const result = await this.executeMethod(step.assert, step.args ?? []);
        if (step.expect) {
          const passed = evaluateExpectation(result, step.expect);
          if (!passed) {
            throw new AssertionError(
              `Assertion failed for ${step.assert}: expected ${JSON.stringify(step.expect)}, got ${JSON.stringify(result)}`,
            );
          }
        }
      }
    } else if (step.action) {
      // Action step
      const result = await this.executeMethod(step.action, step.args ?? []);
      if (step.save_as) {
        snapshots[step.save_as] = result;
      }
    }
  }

  /**
   * Map vector method names to `window.__probe__` calls via page.evaluate().
   */
  async executeMethod(
    method: string,
    args: unknown[],
    waitFor?: Record<string, unknown>,
  ): Promise<unknown> {
    switch (method) {
      case 'query':
        return this.page.evaluate(
          (id: string) => window.__probe__?.query(id) ?? null,
          args[0] as string,
        );

      case 'queryAll':
        return this.page.evaluate(
          (type?: string) => window.__probe__?.queryAll(type as never) ?? [],
          args[0] as string | undefined,
        );

      case 'queryPage':
        return this.page.evaluate(() => {
          const result = window.__probe__?.queryPage();
          if (!result) return null;
          return { ...result, elementCount: result.elements?.length ?? 0 };
        });

      case 'waitForPageReady':
        return this.page.evaluate(
          (timeout: number) => window.__probe__?.waitForPageReady(timeout),
          (args[0] as number) ?? 10000,
        );

      case 'waitForState':
        return this.page.evaluate(
          ({ id, state, timeout }) => window.__probe__?.waitForState(id, state, timeout),
          {
            id: args[0] as string,
            state: args[1] as string,
            timeout: args[2] as number | undefined ?? 5000,
          },
        );

      case 'click':
        return this.page.evaluate(async (id: string) => {
          try {
            await window.__probe__?.click(id);
            return { success: true };
          } catch (e: unknown) {
            const err = e as Error;
            return { error: err.message ?? String(e) };
          }
        }, args[0] as string);

      case 'select':
        return this.page.evaluate(async ({ id, value }) => {
          try {
            await window.__probe__?.select(id, value);
            return { success: true };
          } catch (e: unknown) {
            const err = e as Error;
            return { error: err.message ?? String(e) };
          }
        }, { id: args[0] as string, value: args[1] as string });

      case 'fill':
        return this.page.evaluate(async ({ id, value }) => {
          try {
            await window.__probe__?.fill(id, value);
            return { success: true };
          } catch (e: unknown) {
            const err = e as Error;
            return { error: err.message ?? String(e) };
          }
        }, { id: args[0] as string, value: args[1] as string });

      case 'dispatch': {
        // Generic dispatch: args = [elementId, actionName, ...actionArgs]
        const elementId = args[0] as string;
        const actionName = args[1] as string;
        const actionArgs = args.slice(2);
        return this.executeDispatch(elementId, actionName, actionArgs);
      }

      case 'snapshot':
        return this.page.evaluate(() => window.__probe__?.snapshot() ?? null);

      case 'diff': {
        // Take two snapshots with a brief pause in between
        return this.page.evaluate(async () => {
          const a = window.__probe__?.snapshot();
          // Small delay to allow any changes
          await new Promise(r => setTimeout(r, 50));
          const b = window.__probe__?.snapshot();
          if (!a || !b) return null;
          return window.__probe__?.diff(a, b);
        });
      }

      case 'verifyLinkage':
        return this.page.evaluate(
          async ({ id, action }) => {
            try {
              return await window.__probe__?.verifyLinkage(id, action ?? 'default');
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              return { error: msg, directEffects: [] };
            }
          },
          { id: args[0] as string, action: args[1] as string | undefined },
        );

      case 'actAndWait':
        return this.page.evaluate(
          async ({ id, action, wf }) => {
            try {
              return await window.__probe__?.actAndWait(id, action, wf);
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : String(e);
              return { success: false, error: msg };
            }
          },
          {
            id: args[0] as string,
            action: args[1] as string,
            wf: waitFor ?? {
              target: args[2] as string | undefined,
              state: args[3] as string | undefined,
              timeout: args[4] as number | undefined,
            },
          },
        );

      case 'isEffectivelyVisible':
        return this.page.evaluate(
          (id: string) => window.__probe__?.isEffectivelyVisible(id) ?? false,
          args[0] as string,
        );

      default:
        throw new Error(`Unknown vector method: ${method}`);
    }
  }

  /**
   * Execute a dispatch action (click/select/fill) with error handling that
   * returns structured error objects matching vector expectations.
   */
  private async executeDispatch(
    elementId: string,
    actionName: string,
    actionArgs: unknown[],
  ): Promise<unknown> {
    switch (actionName) {
      case 'click':
        return this.page.evaluate(async (id: string) => {
          try {
            await window.__probe__?.click(id);
            return { success: true };
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message
              : (typeof e === 'object' && e !== null && 'error' in e) ? String((e as Record<string, unknown>).error)
              : String(e);
            if (msg.includes('not found') || msg.includes('NOT_FOUND')) return { error: 'NOT_FOUND' };
            if (msg.includes('not visible') || msg.includes('NOT_VISIBLE')) return { error: 'NOT_VISIBLE' };
            if (msg.includes('disabled') || msg.includes('DISABLED')) return { error: 'DISABLED' };
            // Check if the thrown object itself has an error property matching known codes
            if (typeof e === 'object' && e !== null && 'error' in e) {
              const code = String((e as Record<string, unknown>).error);
              if (['NOT_FOUND', 'NOT_VISIBLE', 'DISABLED', 'BUSY'].includes(code)) return { error: code };
            }
            return { error: msg };
          }
        }, elementId);

      case 'select':
        return this.page.evaluate(async ({ id, value }) => {
          try {
            await window.__probe__?.select(id, value);
            return { success: true };
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message
              : (typeof e === 'object' && e !== null && 'error' in e) ? String((e as Record<string, unknown>).error)
              : String(e);
            if (msg.includes('not found') || msg.includes('NOT_FOUND')) return { error: 'NOT_FOUND' };
            if (msg.includes('OPTION_NOT_FOUND') || msg.includes('option')) return { error: 'OPTION_NOT_FOUND' };
            if (typeof e === 'object' && e !== null && 'error' in e) {
              const code = String((e as Record<string, unknown>).error);
              if (['NOT_FOUND', 'OPTION_NOT_FOUND'].includes(code)) return { error: code };
            }
            return { error: msg };
          }
        }, { id: elementId, value: actionArgs[0] as string });

      case 'fill':
        return this.page.evaluate(async ({ id, value }) => {
          try {
            await window.__probe__?.fill(id, value);
            return { success: true };
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message
              : (typeof e === 'object' && e !== null && 'error' in e) ? String((e as Record<string, unknown>).error)
              : String(e);
            if (msg.includes('not found') || msg.includes('NOT_FOUND')) return { error: 'NOT_FOUND' };
            if (msg.includes('TYPE_MISMATCH') || msg.includes('type mismatch') || msg.includes('Cannot fill')) return { error: 'TYPE_MISMATCH' };
            if (typeof e === 'object' && e !== null && 'error' in e) {
              const code = String((e as Record<string, unknown>).error);
              if (['NOT_FOUND', 'TYPE_MISMATCH'].includes(code)) return { error: code };
            }
            return { error: msg };
          }
        }, { id: elementId, value: actionArgs[0] as string });

      default:
        return this.page.evaluate(async ({ id, action }) => {
          try {
            const probe = window.__probe__;
            if (!probe) throw new Error('Probe not available');
            const fn = (probe as Record<string, Function>)[action];
            if (typeof fn !== 'function') throw new Error(`Unknown action: ${action}`);
            await fn.call(probe, id);
            return { success: true };
          } catch (e: unknown) {
            return { error: (e as Error).message ?? String(e) };
          }
        }, { id: elementId, action: actionName });
    }
  }
}

/**
 * Custom error to distinguish assertion failures from runtime errors.
 */
class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

// Extend Window type for __probe__ access inside page.evaluate
declare global {
  interface Window {
    __probe__?: {
      query(id: string): unknown;
      queryAll(type?: string): unknown[];
      queryPage(): { elements?: unknown[]; [key: string]: unknown } | undefined;
      waitForPageReady(timeout?: number): Promise<void>;
      waitForState(id: string, state: string, timeout?: number): Promise<void>;
      click(id: string): Promise<void>;
      select(id: string, value: string): Promise<void>;
      fill(id: string, value: string): Promise<void>;
      snapshot(): unknown;
      diff(a: unknown, b: unknown): unknown;
      verifyLinkage(id: string, action: string): Promise<unknown>;
      actAndWait(id: string, action: string, waitFor: unknown): Promise<unknown>;
      isEffectivelyVisible(id: string): boolean;
    };
  }
}
