# UI Test Probe — 需求规格

> 需求文档 | 2026-03-27（更新于设计定稿后）
> 状态：需求定义 + 技术设计完成

---

## 1. 问题陈述

当前 AI 驱动的测试和验收是**纯黑盒**模式：

- 截图 → LLM 看图 → 猜测"DataGrid 有没有数据"
- Playwright 操作 → 等固定时间 → 检查 DOM 文本
- 联动验证 → 触发 → 等 500ms-2s → 看结果

三个核心问题：

| 问题 | 根因 | 后果 |
|------|------|------|
| **效率低** | 每次验证都要截图、等待、重试 | 60 个页面的验收需要 2+ 小时 |
| **不稳定** | 依赖时序（网络延迟、渲染时机） | 同一个测试有时过有时不过 |
| **深度不够** | 只能看到外部表现，看不到内部状态 | "有数据"但不知道数据是否正确、来源是否对 |

**根本原因**：UI 不会"说话"。测试工具只能从外部观察，无法从内部获取信息。

## 2. 目标

构建一套**轻侵入、强表达**的 UI 可观测基础设施，让 UI 具备：

1. **可识别**：每个关键控件有唯一语义标识
2. **可查询**：测试工具能直接查询控件状态，不靠截图猜
3. **可感知**：状态变化有事件通知，不靠固定等待
4. **可诊断**：问题发生时能追溯到数据来源和触发链路
5. **可操作**：通过语义 ID 精准操作控件，操作前自动检查可用性

## 3. 7 个测试重灾区

| # | 重灾区 | 核心痛点 |
|---|--------|---------|
| 1 | **数据联动** | 触发→传递→响应的因果链不可见 |
| 2 | **控件状态** | loading/loaded/error/empty/disabled 截图分不清 |
| 3 | **接缝处** | API 调用与 UI 控件的关联不可见 |
| 4 | **数据网格** | 有没有数据、数据对不对、排序/筛选/选中状态 |
| 5 | **分页** | 翻页重复、并发乱序、筛选不重置、边界状态 |
| 6 | **多媒体** | 图片 404/占位符、视频卡第一帧、Canvas 数据源 |
| 7 | **焦点跳转** | Tab 顺序、焦点陷阱、弹窗焦点锁定 |

## 4. 设计原则

| 原则 | 说明 |
|------|------|
| **零业务逻辑耦合** | 不读业务代码来设计测试，只观测 UI 层的显示对象和状态 |
| **轻侵入** | 开发者仅需在关键控件上加标注，一个页面 5-10 个，总成本 < 30 分钟 |
| **生产零影响** | 收集器仅在测试环境注入，生产构建完全不包含 |
| **跨平台通用** | 统一规范，每个平台用原生方式实现 |
| **LLM 友好** | 查询接口返回结构化 JSON |

## 5. 6 个能力原语

| # | 原语 | 职责 |
|---|------|------|
| 1 | **Element Registry** | 注册 + 查询 UI 元素（语义标识 + 类型 + 属性） |
| 2 | **State Exposure** | 暴露元素实时状态（行数/选项/值/加载态/验证错误） |
| 3 | **Event Stream** | 状态变化/交互事件的订阅流（事件驱动，非轮询） |
| 4 | **Source Binding** | 元素与数据来源的关联（API url/status/payload） |
| 5 | **Layout Metrics** | 尺寸/位置/滚动位置/渲染时间 |
| 6 | **Action Dispatch** | 语义化操作 + 操作前智能检查 + 联动自动验证 |

7 个痛点全部是这 6 个原语的组合：

| 痛点 | = 哪些原语组合 |
|------|--------------|
| 数据联动 | Event Stream + State Exposure + Action Dispatch |
| 控件状态 | State Exposure |
| 接缝处 | Source Binding + State Exposure |
| 数据网格 | State Exposure（rows/columns/sort/filter/selectedRows） |
| 分页 | State Exposure + Event Stream + Linkage（Paginator → DataGrid） |
| 多媒体 | State Exposure（playing/readyState/currentTime）+ Source Binding |
| 焦点跳转 | Event Stream（focus 变化）+ Element Registry（tabIndex） |

## 6. 统一元素模型（15 个属性）

```typescript
interface ProbeElement {
  id: string;                    // 语义标识
  type: ProbeType;               // 控件类型枚举（9 种）
  accessibility: { role?, label?, tabIndex? };
  state: { current, previous?, timestamp, isOpen?, validationErrors? };
  data: { value?, options?, rows?, columns?, sort?, filter?, selectedRows?,
          currentTime?, duration?, readyState?, paused?, networkState? };
  source?: { url, method, status?, responseTime?, payload? };
  linkage?: { targets: [{ id, effect, path }] };
  layout: { x, y, width, height, visible, renderTime?, scrollTop?, scrollLeft? };
  shortcuts?: [{ key, action, platform? }];
  animation?: { playing, name?, duration?, progress? };
  locale?: { language?, direction?, isRTL? };
  theme?: { mode?, colorScheme? };
  eventBindings?: string[];
  session?: { isDirty?, hasUnsavedChanges? };
  parent?: string;               // 父元素 probe ID
  children?: string[];           // 子元素 probe ID 列表
}
```

**type 级扩展**：`data` 字段结构按 `type` 不同而不同（data-container 有 sort/filter，media 有 currentTime/paused）。空字段不暴露。

**层级关系**：`parent` + `children` 形成树形结构。`isEffectivelyVisible(id)` 沿父链检查实际可见性 — 子控件 `visible=true` 但父容器 `hidden` → 实际不可见。这对显隐联动验证至关重要。

## 7. 联动模型（6 种路径）

| 路径类型 | 说明 | 测试关注点 |
|---------|------|-----------|
| **direct** | 纯前端状态传递 | 只验 state 变化 |
| **api** | 经过 API 接缝 | 验 API 调用 + 响应 + 数据映射 |
| **computed** | 计算派生 | 验公式正确性 |
| **store** | 经过状态管理 | 验 store action 正确 dispatch |
| **navigation** | 经过路由 | 验 URL 变化 + 目标页加载 |
| **chain** | 经过中间元素（A→B→C） | 验每一跳的状态 |

## 8. 平台覆盖

| 平台 | 标注方式 | 收集器注入 |
|------|---------|-----------|
| **Web**（React/Vue/Svelte/Angular） | `data-probe-*` HTML 属性 | Playwright `addInitScript` |
| **Flutter**（Web/Mobile/Desktop） | `ProbeWidget` 包装 | WidgetTester 扩展 |
| **SwiftUI**（iOS/macOS） | `.probeId()` modifier | XCUITest 桥接 |
| **Jetpack Compose**（Android） | `Modifier.probeId()` | ComposeTestRule 扩展 |
| **WinUI/MAUI**（Windows） | attached property | UI Automation API |
| **React Native** | `probeProps` | Detox/Appium 桥接 |
| **Electron** | 复用 Web 标注 | 复用 Web 收集器 |

## 9. 效果预期

| 指标 | 黑盒（现在） | 白盒可观测（目标） |
|------|------------|-------------------|
| 数据完整性检查准确率 | ~80% | ~99% |
| 联动验证准确率 | ~70% | ~99% |
| 单页面验证耗时 | 10-30s | 1-3s |
| 60 页面完整验收 | 2+ 小时 | 15-30 分钟 |
| 时序不稳定导致的误判 | 高 | 极低 |

## 10. 实施路线

```
Phase 1（4 周）: spec 规范 + Web SDK + Playwright 集成
Phase 2（3 周）: Flutter SDK + flutter-test 集成
Phase 3（3 周）: iOS + Android 原生 SDK
Phase 4（3 周）: Windows + React Native + CLI 工具
Phase 5（2 周）: myskills 插件集成（testforge/cr-visual/dev-forge）
```

## 11. 详细技术设计

见 [DESIGN.md](./DESIGN.md)
