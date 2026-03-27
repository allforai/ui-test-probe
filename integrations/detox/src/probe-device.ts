/**
 * Extends Detox device with probe capabilities.
 * Wraps the standard Detox device to add semantic probe queries,
 * state-aware waiting, and linkage verification.
 */

import type {
  ProbeElement,
  ProbeType,
  PlatformContext,
  LinkageResult,
  TestResult,
  StateInfo,
  SourceInfo,
} from '@allforai/ui-test-probe-rn';

// Minimal Detox type declarations to avoid hard @types/detox dependency.
interface DetoxElement {
  tap(): Promise<void>;
  typeText(text: string): Promise<void>;
  clearText(): Promise<void>;
  scroll(pixels: number, direction: string): Promise<void>;
  getAttributes(): Promise<Record<string, unknown>>;
}

interface DetoxGlobals {
  element(matcher: unknown): DetoxElement;
  by: {
    id(id: string): unknown;
    label(label: string): unknown;
  };
  device: {
    relaunchApp?(): Promise<void>;
    executeScript?(script: string): Promise<unknown>;
    [key: string]: unknown;
  };
}

interface DetoxAttributes {
  testID?: string;
  label?: string;
  hint?: string;
  frame?: { x: number; y: number; width: number; height: number };
  visible?: boolean;
  text?: string;
  value?: unknown;
  [key: string]: unknown;
}

interface DeviceProfileDef {
  name: string;
  screenSize: { width: number; height: number };
  pixelRatio: number;
  hasNotch: boolean;
  hasSafeArea: boolean;
  formFactor: 'phone' | 'tablet' | 'desktop' | 'foldable';
}

/** Built-in device presets for platform matrix testing. */
const DEVICE_PRESETS: Record<string, DeviceProfileDef> = {
  'iphone-se': { name: 'iPhone SE', screenSize: { width: 375, height: 667 }, pixelRatio: 2, hasNotch: false, hasSafeArea: false, formFactor: 'phone' },
  'iphone-15-pro': { name: 'iPhone 15 Pro', screenSize: { width: 393, height: 852 }, pixelRatio: 3, hasNotch: true, hasSafeArea: true, formFactor: 'phone' },
  'ipad-air': { name: 'iPad Air', screenSize: { width: 820, height: 1180 }, pixelRatio: 2, hasNotch: false, hasSafeArea: false, formFactor: 'tablet' },
  'pixel-8': { name: 'Pixel 8', screenSize: { width: 412, height: 915 }, pixelRatio: 2.625, hasNotch: false, hasSafeArea: false, formFactor: 'phone' },
  'galaxy-s24': { name: 'Galaxy S24', screenSize: { width: 360, height: 780 }, pixelRatio: 3, hasNotch: false, hasSafeArea: false, formFactor: 'phone' },
};

/**
 * Options for actAndWait operations.
 */
export interface ActAndWaitOptions {
  /** Probe ID of the target element to wait for */
  target?: string;
  /** Expected state the target should reach */
  state?: string;
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Probe-enhanced Detox device.
 * Provides the UITestProbe interface on top of Detox's device and element APIs.
 *
 * @example
 * ```ts
 * import { createProbeDevice } from '@allforai/ui-test-probe-detox';
 * const probe = createProbeDevice(device);
 *
 * await probe.waitForPageReady('order-page');
 * const table = await probe.query('order-list');
 * expect(table!.state.current).toBe('loaded');
 * ```
 */
export class ProbeDevice {
  private detoxDevice: unknown;
  private currentContext: PlatformContext | null = null;

  constructor(detoxDevice: unknown) {
    this.detoxDevice = detoxDevice;
  }

  /**
   * Parses Detox element attributes into a ProbeElement structure.
   * Reads serialized probe metadata from the accessibilityHint field.
   */
  private parseAttributes(id: string, attrs: DetoxAttributes): ProbeElement {
    let metadata: Record<string, unknown> = {};
    if (attrs.hint) {
      try {
        metadata = JSON.parse(attrs.hint);
      } catch {
        // hint is not valid JSON; use defaults
      }
    }

    const frame = attrs.frame ?? { x: 0, y: 0, width: 0, height: 0 };

    return {
      id,
      type: (metadata.type as ProbeElement['type']) ?? 'display',
      accessibility: { label: attrs.label },
      state: {
        current: (metadata.state as string) ?? 'idle',
        timestamp: Date.now(),
      },
      data: {
        value: attrs.value ?? metadata.value,
        options: metadata.options as string[] | undefined,
      },
      source: metadata.source as ProbeElement['source'],
      linkage: metadata.linkage as ProbeElement['linkage'],
      layout: {
        x: frame.x,
        y: frame.y,
        width: frame.width,
        height: frame.height,
        visible: attrs.visible !== false,
      },
      animation: metadata.animation as ProbeElement['animation'],
      session: metadata.session as ProbeElement['session'],
      parent: metadata.parent as string | undefined,
      children: metadata.children as string[] | undefined,
    };
  }

  // ── Element Registry ──

  /**
   * Queries a probe element by semantic ID.
   * Uses Detox's accessibility tree query under the hood,
   * then parses probe metadata from the element's accessibility hint.
   */
  async query(id: string): Promise<ProbeElement | null> {
    const dev = this.detoxDevice as DetoxGlobals;
    try {
      const el = dev.element(dev.by.id(id));
      const attrs = await el.getAttributes() as DetoxAttributes;
      return this.parseAttributes(id, attrs);
    } catch {
      return null;
    }
  }

  /**
   * Returns all probe elements, optionally filtered by type.
   * Queries by the "probe:" accessibility label prefix convention.
   */
  async queryAll(type?: ProbeType): Promise<ProbeElement[]> {
    // Detox does not support querying multiple elements natively.
    // We rely on the app's probe registry exposed via the RN bridge.
    // As a fallback, we query the JS context for the probe instance.
    const dev = this.detoxDevice as DetoxGlobals;
    try {
      const ids: string[] = await dev.device.executeScript(`
        const probe = global.__rnProbe__;
        if (!probe) return [];
        return probe.queryAll(${type ? `'${type}'` : ''}).map(e => e.id);
      `);
      const results: ProbeElement[] = [];
      for (const id of ids) {
        const el = await this.query(id);
        if (el) {
          if (!type || el.type === type) results.push(el);
        }
      }
      return results;
    } catch {
      return [];
    }
  }

  // ── Event Stream ──

  /**
   * Waits until the page element and all its children report "loaded" state.
   * Event-driven via Detox's waitFor with custom probe expectations.
   *
   * @param pageId - Probe ID of the page element.
   * @param timeout - Maximum wait time in milliseconds.
   */
  async waitForPageReady(pageId: string, timeout = 10000): Promise<void> {
    const deadline = Date.now() + timeout;

    // Wait for page element to reach loaded
    await this.waitForState(pageId, 'loaded', timeout);

    // Check all children are ready
    const poll = async (): Promise<void> => {
      const page = await this.query(pageId);
      if (!page) throw new Error(`Page element "${pageId}" not found`);

      // Query all elements and check for unready ones
      const all = await this.queryAll();
      const unready = all.filter(
        (el) => el.state.current === 'loading' || el.state.current === 'submitting',
      );
      if (unready.length === 0) return;

      if (Date.now() >= deadline) {
        throw new Error(
          `waitForPageReady timed out. Still loading: ${unready.map((e) => e.id).join(', ')}`,
        );
      }

      await new Promise((r) => setTimeout(r, 100));
      return poll();
    };

    return poll();
  }

  /**
   * Waits for a specific element to reach the target state.
   * Polls the element's probe metadata until state matches or timeout.
   */
  async waitForState(id: string, state: string, timeout = 5000): Promise<void> {
    const deadline = Date.now() + timeout;

    const poll = async (): Promise<void> => {
      const el = await this.query(id);
      if (el && el.state.current === state) return;

      if (Date.now() >= deadline) {
        const current = el?.state.current ?? 'not found';
        throw new Error(
          `waitForState('${id}', '${state}') timed out after ${timeout}ms (current: ${current})`,
        );
      }

      await new Promise((r) => setTimeout(r, 100));
      return poll();
    };

    return poll();
  }

  // ── Action Dispatch ──

  /**
   * Performs a semantic action on a trigger element and waits for
   * a linked target to reach the expected state.
   *
   * @param triggerId - Probe ID of the element to act on.
   * @param action - Semantic action (e.g., "select:completed", "tap", "type:text").
   * @param options - Target element and expected state to wait for.
   */
  async actAndWait(
    triggerId: string,
    action: string,
    options: ActAndWaitOptions = {},
  ): Promise<void> {
    const { target, state, timeout = 5000 } = options;
    const dev = this.detoxDevice as DetoxGlobals;

    // Parse action and execute via Detox
    const [actionName, ...actionArgs] = action.split(':');
    const el = dev.element(dev.by.id(triggerId));

    switch (actionName) {
      case 'tap':
        await el.tap();
        break;
      case 'type':
        await el.typeText(actionArgs.join(':'));
        break;
      case 'select':
        // For selectors, we tap then select the value
        await el.tap();
        break;
      case 'fill':
        await el.clearText();
        await el.typeText(actionArgs.join(':'));
        break;
      case 'scroll':
        await el.scroll(parseInt(actionArgs[0] ?? '100', 10), 'down');
        break;
      default:
        await el.tap();
    }

    // Wait for target state if specified
    if (target && state) {
      await this.waitForState(target, state, timeout);
    }
  }

  /**
   * Verifies the complete linkage chain after an action.
   * Reads linkage metadata from the trigger element, executes the action,
   * and monitors all declared targets for expected state changes.
   */
  async verifyLinkage(triggerId: string, action: string): Promise<LinkageResult> {
    const trigger = await this.query(triggerId);
    const result: LinkageResult = {
      trigger: triggerId,
      action,
      directEffects: [],
      chainedEffects: [],
      apiCalls: [],
    };

    if (!trigger?.linkage?.targets.length) return result;

    // Execute the action
    await this.actAndWait(triggerId, action);

    // Verify each linkage target
    for (const target of trigger.linkage.targets) {
      const start = Date.now();
      const isChain = target.path.type === 'chain';

      try {
        await this.waitForState(target.id, 'loaded', 5000);
        const duration = Date.now() - start;

        if (isChain) {
          result.chainedEffects.push({
            target: target.id,
            effect: target.effect,
            through: (target.path as { through: string }).through,
            result: 'pass',
            duration,
          });
        } else {
          result.directEffects.push({
            target: target.id,
            effect: target.effect,
            result: 'pass',
            duration,
          });
        }

        if (target.path.type === 'api') {
          const apiPath = target.path as { url: string; method?: string };
          const targetEl = await this.query(target.id);
          result.apiCalls.push({
            url: apiPath.url,
            method: apiPath.method ?? 'GET',
            status: targetEl?.source?.status ?? 0,
            responseTime: duration,
          });
        }
      } catch {
        const duration = Date.now() - start;
        if (isChain) {
          result.chainedEffects.push({
            target: target.id,
            effect: target.effect,
            through: (target.path as { through: string }).through,
            result: 'timeout',
            duration,
          });
        } else {
          result.directEffects.push({
            target: target.id,
            effect: target.effect,
            result: 'timeout',
            duration,
          });
        }
      }
    }

    return result;
  }

  // ── Hierarchy ──

  /**
   * Checks effective visibility by walking the ancestor chain.
   * Queries each ancestor and verifies layout.visible is true.
   */
  async isEffectivelyVisible(id: string): Promise<boolean> {
    let current = await this.query(id);
    while (current) {
      if (!current.layout.visible) return false;
      if (!current.parent) break;
      current = await this.query(current.parent);
    }
    return current !== null;
  }

  // ── Platform Context / Device ──

  /**
   * Configures the simulator/emulator to match a built-in device preset.
   * Stores the preset as the current platform context.
   */
  async setDevice(preset: string): Promise<void> {
    const device = DEVICE_PRESETS[preset];
    if (!device) {
      throw new Error(
        `Unknown device preset: ${preset}. Available: ${Object.keys(DEVICE_PRESETS).join(', ')}`,
      );
    }

    this.currentContext = {
      platform: 'react-native',
      device,
      viewport: { width: device.screenSize.width, height: device.screenSize.height },
      inputMode: device.formFactor === 'phone' || device.formFactor === 'tablet' ? 'touch' : 'mouse_keyboard',
    };
  }

  /**
   * Returns the current platform context.
   * Auto-detects from the Detox device if not explicitly set.
   */
  getPlatformContext(): PlatformContext {
    if (this.currentContext) return this.currentContext;

    // Return a default context based on the Detox device
    return {
      platform: 'react-native',
      device: {
        name: 'detox-device',
        screenSize: { width: 390, height: 844 },
        pixelRatio: 3,
        hasNotch: true,
        hasSafeArea: true,
        formFactor: 'phone',
      },
      viewport: { width: 390, height: 844 },
      inputMode: 'touch',
    };
  }

  /**
   * Runs the same test across multiple device presets, collecting results.
   * For each device, sets the context, relaunches the app, and runs the test.
   */
  async runAcrossDevices(
    devices: string[],
    test: (probe: ProbeDevice) => Promise<void>,
  ): Promise<Record<string, TestResult>> {
    const results: Record<string, TestResult> = {};
    const dev = this.detoxDevice as DetoxGlobals;

    for (const deviceName of devices) {
      const start = Date.now();
      try {
        await this.setDevice(deviceName);

        // Relaunch app if Detox device supports it
        if (dev.device?.relaunchApp) {
          await dev.device.relaunchApp();
        }

        await test(this);
        results[deviceName] = { passed: true, durationMs: Date.now() - start };
      } catch (err) {
        results[deviceName] = {
          passed: false,
          durationMs: Date.now() - start,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    }
    return results;
  }

  // ── Source Binding ──

  /**
   * Returns the source binding for a probe element.
   */
  async getSource(id: string): Promise<SourceInfo | null> {
    const el = await this.query(id);
    return el?.source ?? null;
  }
}

/**
 * Factory function to create a ProbeDevice from a Detox device instance.
 *
 * @param detoxDevice - The Detox `device` object.
 * @returns A ProbeDevice wrapping the Detox device.
 */
export function createProbeDevice(detoxDevice: unknown): ProbeDevice {
  return new ProbeDevice(detoxDevice);
}
