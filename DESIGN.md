# UI Test Probe — Technical Design

> 技术设计文档 | 2026-03-27
> 基于 SPEC.md 需求文档的实现方案

---

## 1. 统一抽象模型

所有平台共享一个平台无关的元素模型。每个平台 SDK 负责将自己的 UI 树（DOM / Widget Tree / SwiftUI View / Compose Node）映射到此统一结构。

### ProbeElement（15 个属性 + type 级扩展）

```typescript
interface ProbeElement {
  // === Element Registry ===
  id: string;                          // 语义标识 "order-list"
  type: ProbeType;                     // 控件类型
  accessibility: {
    role?: string;                     // "table" / "button" / "combobox"
    label?: string;                    // 屏幕阅读器朗读文本
    tabIndex?: number;
  };

  // === State Exposure ===
  state: {
    current: string;                   // "loading" | "loaded" | "error" | "empty" | "disabled" | "submitting"
    previous?: string;
    timestamp: number;                 // 最后变化时间
    isOpen?: boolean;                  // modal/dialog/popover/tooltip
    validationErrors?: Array<{field: string; message: string}>;
  };

  // === Data（按 type 不同结构不同）===
  data: {
    // 通用
    value?: any;
    options?: string[];
    rows?: number;
    columns?: Array<{id: string; label: string; visible: boolean}>;

    // type=data-container 扩展
    sort?: {column: string; direction: "asc" | "desc"};
    filter?: Array<{field: string; operator: string; value: any}>;
    selectedRows?: string[];

    // type=media 扩展
    currentTime?: number;
    duration?: number;
    readyState?: number;
    paused?: boolean;
    networkState?: number;
  };

  // === Source Binding ===
  source?: {
    url: string;
    method: string;
    status?: number;
    responseTime?: number;
    payload?: any;
  };

  // === Linkage ===
  linkage?: {
    targets: Array<{
      id: string;
      effect: LinkageEffect;
      path: LinkagePath;
    }>;
  };

  // === Layout Metrics ===
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
    renderTime?: number;
    scrollTop?: number;
    scrollLeft?: number;
  };

  // === Shortcuts ===
  shortcuts?: Array<{
    key: string;
    action: string;
    platform?: string;
  }>;

  // === Animation ===
  animation?: {
    playing: boolean;
    name?: string;
    duration?: number;
    progress?: number;
  };

  // === Locale ===
  locale?: {
    language?: string;
    direction?: "ltr" | "rtl";
    isRTL?: boolean;
  };

  // === Theme ===
  theme?: {
    mode?: "light" | "dark" | "high-contrast";
    colorScheme?: string;
  };

  // === Event Bindings ===
  eventBindings?: string[];

  // === Session ===
  session?: {
    isDirty?: boolean;
    hasUnsavedChanges?: boolean;
  };

  // === Hierarchy ===
  parent?: string;             // 父元素 probe ID
  children?: string[];         // 子元素 probe ID 列表
}
```

### ProbeType 枚举

```typescript
enum ProbeType {
  DATA_CONTAINER = "data-container",   // Table / DataGrid / List / Tree
  SELECTOR = "selector",               // ComboBox / Select / Dropdown
  ACTION = "action",                   // Button / Link / MenuItem
  DISPLAY = "display",                 // Label / Badge / Counter / Chip
  MEDIA = "media",                     // Image / Video / Audio / Canvas
  FORM = "form",                       // Input / TextArea / Checkbox / Radio
  PAGE = "page",                       // 页面级容器
  MODAL = "modal",                     // Dialog / Drawer / Popover / Tooltip
  NAVIGATION = "navigation",           // Tabs / Breadcrumb / Sidebar / Paginator
}
```

### 平台上下文

```typescript
interface PlatformContext {
  platform: Platform;
  device: DeviceProfile;
  viewport: { width: number; height: number };
  inputMode: InputMode;
}

enum Platform {
  WEB_CHROME = "web-chrome",
  WEB_SAFARI = "web-safari",
  WEB_FIREFOX = "web-firefox",
  IOS = "ios",
  ANDROID = "android",
  MACOS = "macos",
  WINDOWS = "windows",
  LINUX = "linux",
}

interface DeviceProfile {
  name: string;                    // "iPhone 15 Pro"
  screenSize: { width: number; height: number };
  pixelRatio: number;
  hasNotch: boolean;
  hasSafeArea: boolean;
  formFactor: "phone" | "tablet" | "desktop" | "foldable";
}

enum InputMode {
  TOUCH = "touch",
  MOUSE_KEYBOARD = "mouse_keyboard",
  STYLUS = "stylus",
  GAMEPAD = "gamepad",
}
```

**内置设备预设**（框架自带，开发者不需要手动填参数）：

| 预设 | 尺寸 | 比例 | 形态 |
|------|------|------|------|
| `iphone-se` | 375×667 | 2x | phone |
| `iphone-15-pro` | 393×852 | 3x | phone |
| `ipad-air` | 820×1180 | 2x | tablet |
| `ipad-pro-12` | 1024×1366 | 2x | tablet |
| `pixel-8` | 412×915 | 2.625x | phone |
| `galaxy-s24` | 360×780 | 3x | phone |
| `galaxy-tab-s9` | 800×1280 | 2x | tablet |
| `galaxy-fold` | 373×846 | 3x | foldable |
| `macbook-air-13` | 1470×956 | 2x | desktop |
| `desktop-1080p` | 1920×1080 | 1x | desktop |
| `desktop-1440p` | 2560×1440 | 1x | desktop |

**各平台 setDevice 实现**：

| 平台 | 实现方式 |
|------|---------|
| Web | Playwright `page.setViewportSize()` |
| Flutter | `WidgetTester` 设置 `Size` + `MediaQuery` |
| iOS | 选择 Simulator 设备 |
| Android | 选择 Emulator AVD |
| macOS/Windows | 设置窗口尺寸 |

**平台矩阵测试**：同一测试函数通过 `runAcrossDevices()` 在多设备上执行，结果按设备汇总。Flutter/RN/MAUI 等跨平台框架一次编写测试，自动覆盖所有目标设备。

### 设计原则

- **空字段不暴露**：按钮没有 `source`，分页器没有 `animation`，只有实际有值的字段才出现
- **type 决定 data 结构**：`data-container` 有 sort/filter/selectedRows，`media` 有 currentTime/duration/paused
- **层级关系**：`parent` + `children` 形成树形结构，`isEffectivelyVisible()` 沿父链检查实际可见性（子控件 visible 但父容器 hidden → 实际不可见）
- **所有平台映射到同一结构**：测试代码写一次查询逻辑，跨平台复用

---

## 2. 联动模型

### 6 种联动路径

```typescript
enum LinkageEffect {
  OPTIONS_UPDATE = "options_update",
  DATA_RELOAD = "data_reload",
  VISIBILITY_TOGGLE = "visibility_toggle",
  ENABLED_TOGGLE = "enabled_toggle",
  VALUE_UPDATE = "value_update",
  RESET = "reset",
  NAVIGATE = "navigate",
}

type LinkagePath =
  | { type: "direct" }                                     // 纯前端状态传递
  | { type: "api"; url: string; method?: string }          // 经过 API 接缝
  | { type: "computed"; expression: string }                // 计算派生
  | { type: "store"; storeName: string; action?: string }   // 经过状态管理
  | { type: "navigation"; route: string }                   // 经过路由导航
  | { type: "chain"; through: string }                      // 经过中间元素
```

### 联动路径示例

**direct — 纯前端状态**：
```
CheckBox#invoice-type → Input#tax-number
effect: visibility_toggle
path: { type: "direct" }
测试：改 checkbox → waitForState → 验证 input 出现。不检查网络。
```

**api — 经过 API 接缝**：
```
Select#status-filter → DataGrid#order-table
effect: data_reload
path: { type: "api", url: "GET /api/orders" }
测试：改 select → 等 source.status === 200 → 验证 data.rows 变化 + URL 含 ?status=completed
```

**computed — 计算派生**：
```
Input#quantity → Label#total-price
effect: value_update
path: { type: "computed", expression: "quantity * unitPrice" }
测试：改 quantity=10 → 验证 total-price.data.value === 10 * unitPrice
```

**store — 经过状态管理**：
```
Button#add-to-cart → Badge#cart-badge
effect: value_update
path: { type: "store", storeName: "cartStore", action: "addItem" }
测试：记录 before → 点 button → 验证 badge.data.value === before + 1
```

**navigation — 经过路由**：
```
Row#order-row-001 → Page#order-detail-page
effect: navigate
path: { type: "navigation", route: "/orders/:id" }
测试：点 row → 等 URL 变化 → 等 detail-page.state === "loaded"
```

**chain — 链式（A → B → C）**：
```
Select#province → Select#city (api) → Select#district (reset via chain)
测试：verifyLinkage 返回 directEffects + chainedEffects + apiCalls 全链路状态
```

### 链式联动验证结果

```typescript
interface LinkageResult {
  trigger: string;
  action: string;
  directEffects: Array<{
    target: string;
    effect: string;
    result: "pass" | "fail" | "timeout";
    duration: number;
  }>;
  chainedEffects: Array<{
    target: string;
    effect: string;
    through: string;
    result: "pass" | "fail" | "timeout";
    duration: number;
  }>;
  apiCalls: Array<{
    url: string;
    method: string;
    status: number;
    responseTime: number;
  }>;
}
```

---

## 3. 6 个原语 API

```typescript
interface UITestProbe {
  // === 原语 1: Element Registry ===
  query(id: string): ProbeElement | null;
  queryAll(type?: ProbeType): ProbeElement[];
  queryPage(): {
    id: string;
    state: string;
    elements: ProbeElement[];
    unreadyElements: string[];
  };

  // === 原语 1.5: Platform Context ===
  setPlatformContext(context: PlatformContext): Promise<void>;
  getPlatformContext(): PlatformContext;
  setDevice(preset: string): Promise<void>;   // 'iphone-15-pro' / 'pixel-8' / 'ipad-air'
  runAcrossDevices(
    devices: string[],
    test: (probe: UITestProbe) => Promise<void>
  ): Promise<Record<string, TestResult>>;

  // === 原语 1.6: Hierarchy ===
  queryChildren(id: string): ProbeElement[];                // 直接子元素
  queryDescendants(id: string): ProbeElement[];              // 所有后代
  queryParent(id: string): ProbeElement | null;              // 父元素
  getAncestorChain(id: string): ProbeElement[];              // 从根到自身的完整路径
  isEffectivelyVisible(id: string): boolean;                 // 沿父链检查实际可见性
  // 子控件 visible=true 但父容器 hidden → isEffectivelyVisible 返回 false

  // === 原语 2: State Exposure ===
  getState(id: string): ProbeElement['state'];
  getStates(ids: string[]): Record<string, ProbeElement['state']>;

  // === 原语 3: Event Stream ===
  waitForState(id: string, state: string, timeout?: number): Promise<void>;
  waitForPageReady(timeout?: number): Promise<void>;
  onStateChange(id: string, callback: (oldState: string, newState: string) => void): () => void;
  onEvent(id: string, event: string, callback: (detail: any) => void): () => void;

  // === 原语 4: Source Binding ===
  getSource(id: string): ProbeElement['source'] | null;
  getNetworkLog(): Array<{
    url: string;
    method: string;
    status: number;
    elementId?: string;
    timestamp: number;
  }>;
  waitForSource(id: string, timeout?: number): Promise<ProbeElement['source']>;

  // === 原语 5: Layout Metrics ===
  getLayout(id: string): ProbeElement['layout'];
  getOverlaps(): Array<{ a: string; b: string; overlapArea: number }>;
  getScrollPosition(id: string): { scrollTop: number; scrollLeft: number };

  // === 原语 6: Action Dispatch ===

  // 基础操作
  click(id: string): Promise<void>;
  doubleClick(id: string): Promise<void>;
  rightClick(id: string): Promise<void>;
  hover(id: string): Promise<void>;
  focus(id: string): Promise<void>;

  // 输入操作
  type(id: string, text: string): Promise<void>;
  fill(id: string, value: string): Promise<void>;
  clear(id: string): Promise<void>;

  // 选择操作
  select(id: string, value: string): Promise<void>;
  check(id: string, checked: boolean): Promise<void>;

  // 滚动操作
  scrollTo(id: string, position: { top?: number; left?: number }): Promise<void>;
  scrollToBottom(id: string): Promise<void>;
  scrollIntoView(id: string): Promise<void>;

  // 拖拽
  drag(sourceId: string, targetId: string): Promise<void>;

  // 快捷键
  pressShortcut(key: string): Promise<void>;

  // 导航
  navigate(route: string): Promise<void>;

  // 复合操作
  snapshot(): ProbeSnapshot;
  diff(a: ProbeSnapshot, b: ProbeSnapshot): SnapshotDiff[];
  verifyLinkage(triggerId: string, action: string): Promise<LinkageResult>;

  // 操作 + 等待 + 验证 一体化
  actAndWait(
    id: string,
    action: string,
    waitFor: {
      target?: string;
      state?: string;
      timeout?: number;
    }
  ): Promise<{
    actionDuration: number;
    waitDuration: number;
    targetState: ProbeElement['state'];
    linkageResults?: LinkageResult;
  }>;
}
```

### 操作前智能检查

每个 Action Dispatch 操作执行前自动检查：

| 检查 | 条件 | 拒绝响应 |
|------|------|---------|
| 元素存在 | `query(id) === null` | `{ error: "NOT_FOUND", id }` |
| 元素可见 | `layout.visible === false` | `{ error: "NOT_VISIBLE", id }` |
| 元素可用 | `state.current === "disabled"` | `{ error: "DISABLED", reason: state.validationErrors }` |
| 元素不忙 | `state.current === "loading"` | `{ error: "BUSY", reason: "still loading" }` |
| 选项存在 | `select` 时 `value not in options` | `{ error: "OPTION_NOT_FOUND", available: data.options }` |

### 操作后联动自动验证

如果操作的元素有 `linkage` 声明，操作完成后自动检查所有 targets 的响应：

```
select('province', '广东')
  → 智能检查 pass
  → 执行选择
  → 发现 linkage: [city-select, district-select]
  → 等 city-select 响应 → pass (340ms)
  → 等 district-select 响应 → pass (5ms)
  → 返回 { action, linkageResults }
```

---

## 4. 跨平台 SDK 架构

### 分层设计

```
┌─────────────────────────────────────────────────┐
│  Testing Tools（消费者）                          │
│  Playwright / Flutter Test / XCUITest / ...      │
├─────────────────────────────────────────────────┤
│  ProbeAPI（统一查询 + 操作协议）                   │
│  JSON-based，跨平台一致                          │
├─────────────────────────────────────────────────┤
│  Platform Adapters（平台适配层）                   │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐    │
│  │ Web  │Flutt.│ iOS  │Andro.│ WinUI│ RN   │    │
│  │ JS   │ Dart │Swift │Kotlin│ C#   │ JS   │    │
│  └──────┴──────┴──────┴──────┴──────┴──────┘    │
├─────────────────────────────────────────────────┤
│  Annotation Layer（标注层）                       │
│  Web: data-probe-*  Flutter: ProbeWidget         │
│  iOS: .probeId()    Compose: Modifier.probeId()  │
└─────────────────────────────────────────────────┘
```

### 每个平台 SDK 的组成

```
sdk/{platform}/
├── annotations/     ← 标注工具（开发时用）
├── collector/       ← 收集器（运行时注入，测试时用）
└── integration/     ← 测试工具集成（测试代码中用）
```

### 各平台标注方式

| 平台 | 标注方式 | 示例 |
|------|---------|------|
| **Web** | `data-probe-*` HTML 属性 | `<table data-probe-id="order-list" data-probe-type="data-container">` |
| **Flutter** | `ProbeWidget` 包装 | `ProbeWidget(id: 'order-list', type: ProbeType.dataContainer, child: DataTable(...))` |
| **SwiftUI** | `.probeId()` modifier | `List { ... }.probeId("order-list").probeType(.dataContainer)` |
| **Compose** | `Modifier.probeId()` | `LazyColumn(modifier = Modifier.probeId("order-list").probeType(DataContainer))` |
| **WinUI/MAUI** | attached property | `<ListView probe:Probe.Id="order-list" probe:Probe.Type="DataContainer">` |
| **React Native** | `probeProps` | `<FlatList testID="order-list" probeProps={{type: 'data-container'}}>` |
| **Electron** | 复用 Web 标注 | 与 Web 相同 |

### 各平台收集器注入方式

| 平台 | 注入方式 | 生产环境影响 |
|------|---------|------------|
| **Web** | Playwright `addInitScript()` | 零 |
| **Flutter** | `WidgetTester` 扩展 | 零 |
| **iOS** | XCUITest 进程桥接 | 零 |
| **Compose** | `ComposeTestRule` 扩展 | 零 |
| **WinUI** | UI Automation API | 零 |
| **React Native** | Detox/Appium 桥接 | 零 |

### 一致性保证

`spec/conformance-tests/` 提供平台无关的 JSON 测试用例，所有平台 SDK 的 CI 必须通过。

---

## 5. 标注成本

### 单页面标注量

| 页面复杂度 | 关键元素数 | 标注耗时 | 占开发时间 |
|-----------|-----------|---------|-----------|
| 简单页 | 2-3 | 5 分钟 | < 2% |
| 中等页 | 5-8 | 15 分钟 | < 5% |
| 复杂页 | 10-15 | 30 分钟 | < 8% |
| 20 页项目 | ~120 总计 | ~3 小时 | < 5% |

### 降低成本策略

1. **自动标注生成**：dev-forge `/task-execute` 生成代码时自动带标注
2. **已有项目 CLI**：`npx @allforai/ui-test-probe-cli instrument ./src`
3. **零标注降级**：无标注时通过 Accessibility Tree 自动发现（能力有限但可用）

---

## 6. 项目结构

```
ui-test-probe/
├── spec/                           # 平台无关规范
│   ├── probe-element.schema.json
│   ├── probe-api.schema.json
│   ├── linkage-model.md
│   ├── probe-types.md
│   └── conformance-tests/
│
├── sdk/
│   ├── web/                        # TypeScript — @allforai/ui-test-probe-web
│   ├── flutter/                    # Dart — ui_test_probe_flutter
│   ├── ios/                        # Swift — UITestProbe
│   ├── android/                    # Kotlin — ui-test-probe-android
│   ├── windows/                    # C# — UITestProbe.NET
│   └── react-native/              # TypeScript — @allforai/ui-test-probe-rn
│
├── integrations/
│   ├── playwright/                 # @allforai/ui-test-probe-playwright
│   ├── flutter-test/
│   ├── xctest/
│   └── compose-test/
│
├── tools/
│   └── cli/                        # @allforai/ui-test-probe-cli
│
├── SPEC.md
├── DESIGN.md                       # 本文件
├── README.md
└── LICENSE
```

### 发布渠道

| 包 | 发布到 |
|---|-------|
| `@allforai/ui-test-probe-web` | npm |
| `ui_test_probe_flutter` | pub.dev |
| `UITestProbe` (Swift) | Swift Package Manager |
| `ui-test-probe-android` | Maven Central |
| `UITestProbe.NET` | NuGet |
| `@allforai/ui-test-probe-rn` | npm |
| `@allforai/ui-test-probe-playwright` | npm |
| `@allforai/ui-test-probe-cli` | npm |

---

## 7. 实施路线

```
Phase 1: 规范 + Web SDK（4 周）
├── spec/ 完成
├── sdk/web/ 完成
├── integrations/playwright/ 完成
└── 交付：Web 项目可用

Phase 2: Flutter SDK（3 周）
├── sdk/flutter/ 完成
├── integrations/flutter-test/ 完成
└── 交付：Flutter 全平台可用

Phase 3: iOS + Android 原生（3 周，可并行）
├── sdk/ios/ + integrations/xctest/
├── sdk/android/ + integrations/compose-test/
└── 交付：原生移动端可用

Phase 4: Windows + React Native + CLI（3 周，可并行）
├── sdk/windows/ + sdk/react-native/
├── tools/cli/
└── 交付：全平台覆盖 + 自动标注

Phase 5: myskills 集成（2 周）
├── dev-forge 代码生成自动带标注
├── testforge 测试生成适配 ProbeAPI
├── cr-visual 用 ProbeAPI 替代截图
└── 交付：AI 测试工具链闭环
```

### Phase 1 成功标准

```typescript
// 1. 语义查询替代截图
const list = await page.probe.query('order-list');
expect(list.state.current).toBe('loaded');
expect(list.data.rows).toBeGreaterThanOrEqual(1);
expect(list.source.status).toBe(200);

// 2. 智能等待替代固定 timeout
await page.probe.waitForPageReady();

// 3. 语义操作替代 CSS 选择器
await page.probe.select('status-filter', 'completed');

// 4. 操作+等待+联动验证一体化
const result = await page.probe.actAndWait(
  'status-filter', 'select:completed',
  { target: 'order-table', state: 'loaded' }
);
expect(result.linkageResults.directEffects[0].result).toBe('pass');

// 5. 回归快照对比
const before = await page.probe.snapshot();
await page.probe.click('refresh-btn');
const after = await page.probe.snapshot();
const changes = page.probe.diff(before, after);
```
