# CLAUDE.md

## Project: UI Test Probe

Cross-platform UI test observability framework. Transforms black-box screenshot testing into white-box state queries.

**Repo**: https://github.com/allforai/ui-test-probe
**Local**: /Users/aa/Documents/ui-test-probe

## Architecture Summary

### Core Concept
Light annotation on UI controls (`data-probe-*` / `ProbeWidget` / `.probeId()`) + runtime collector injected at test time → exposes `window.__probe__` (or platform equivalent) API for structured queries and semantic actions.

### 6 Primitives
1. **Element Registry** — register + query by semantic ID
2. **State Exposure** — real-time state (loaded/error/disabled/submitting...)
3. **Event Stream** — subscribe to state changes (event-driven, not polling)
4. **Source Binding** — link elements to API data sources (url/status/payload)
5. **Layout Metrics** — position, size, scroll, render time
6. **Action Dispatch** — semantic operations with smart pre-checks + auto linkage verification

### Auxiliary Capabilities
- **Hierarchy** — parent/children tree + `isEffectivelyVisible()` ancestor chain check
- **Platform Context** — device profiles + `runAcrossDevices()` matrix testing

### 15 Element Attributes
id, type, accessibility, state, data, source, linkage, layout, shortcuts, animation, locale, theme, eventBindings, session, parent, children

### 6 Linkage Path Types
direct, api, computed, store, navigation, chain

### 9 ProbeTypes
data-container, selector, action, display, media, form, page, modal, navigation

### Type-Specific Data Extensions
- `data-container`: sort, filter, selectedRows
- `media`: currentTime, duration, readyState, paused, networkState

## Project Structure

```
ui-test-probe/
├── spec/                    ← Platform-agnostic specification (JSON Schema + TS types + devices)
├── sdk/
│   ├── web/                 ← TypeScript — THE REFERENCE IMPLEMENTATION (do this first)
│   ├── flutter/             ← Dart
│   ├── ios/                 ← Swift (SwiftUI)
│   ├── android/             ← Kotlin (Jetpack Compose)
│   ├── windows-core/        ← C# shared models + interfaces
│   ├── windows-wpf/         ← C# WPF (DependencyProperty)
│   ├── windows-winform/     ← C# WinForms (ExtenderProvider)
│   ├── windows-winui/       ← C# WinUI/MAUI (BindableProperty)
│   └── react-native/        ← TypeScript
├── integrations/
│   ├── playwright/          ← Web test integration
│   ├── flutter-test/        ← Flutter test integration
│   ├── xctest/              ← iOS test integration
│   ├── compose-test/        ← Android test integration
│   ├── wpf-test/            ← WPF test integration
│   ├── winform-test/        ← WinForms test integration
│   ├── winui-test/          ← WinUI/MAUI test integration
│   └── detox/               ← React Native test integration
├── tools/cli/               ← instrument + validate + report commands
├── examples/                ← 7 platform demos (web-react, web-vue, flutter, ios, android, windows, rn)
├── SPEC.md                  ← Requirements
├── DESIGN.md                ← Technical design (authoritative)
└── README.md
```

## Current State

- **spec/**: Complete — JSON Schema, TypeScript types, device presets
- **sdk/***: Scaffolded — package configs + type definitions + stub implementations (throw NotImplementedError)
- **sdk/windows-core/**: Shared models (ProbeTypes) + IProbeRegistry interface + ActionDispatcherBase
- **sdk/windows-wpf/**: WPF adapter — DependencyProperty annotations + VisualTreeHelper registry
- **sdk/windows-winform/**: WinForms adapter — ExtenderProvider annotations + Control tree registry
- **sdk/windows-winui/**: WinUI/MAUI adapter — BindableProperty annotations (adapted from original sdk/windows/)
- **integrations/***: Scaffolded — same as above
- **tools/cli/**: Scaffolded
- **examples/**: Reference usage demos (not runnable yet — depend on SDK implementation). Electron removed (reuses Web SDK).

## What To Do Next

### Phase 1: Web SDK + Playwright (implement first, this is the reference)

**Priority order within Web SDK:**

1. **spec/probe-types.ts** — verify types are complete and match DESIGN.md (already done, review only)

2. **sdk/web/src/annotations/parser.ts** — implement `AnnotationParser.parse()`
   - Reads `data-probe-*` HTML attributes from DOM elements
   - Returns ProbeElement structure
   - This is the foundation — everything else depends on parsing annotations

3. **sdk/web/src/collector/registry.ts** — implement `ElementRegistry`
   - `scan()` — find all `[data-probe-id]` elements in DOM, parse each, register
   - `query(id)` / `queryAll(type)` — lookup from registry Map
   - `startObserving()` — MutationObserver for new/removed probe elements

4. **sdk/web/src/collector/state-observer.ts** — implement `StateObserver`
   - MutationObserver watching `data-probe-state` attribute changes
   - `waitForState(id, state, timeout)` — Promise that resolves when state matches
   - `onStateChange(id, callback)` — subscribe to changes

5. **sdk/web/src/collector/event-stream.ts** — already implemented (pub/sub + history buffer)

6. **sdk/web/src/collector/source-tracker.ts** — implement `SourceTracker`
   - Intercept `fetch()` and `XMLHttpRequest`
   - Match request URLs to `data-probe-source` attributes
   - Track: url, method, status, responseTime, payload

7. **sdk/web/src/collector/layout-tracker.ts** — implement `LayoutTracker`
   - `getBoundingClientRect()` for position/size
   - `IntersectionObserver` for visibility
   - `PerformanceObserver` for render timing

8. **sdk/web/src/actions/dispatcher.ts** — implement `ActionDispatcher`
   - Pre-check logic (already implemented: validates exists/visible/enabled/not-busy)
   - Actual DOM actions: click, fill, select (dispatch real events)
   - `actAndWait()` — action + waitForState on target + auto linkage check

9. **sdk/web/src/probe.ts** — implement `WebProbe` main class
   - Compose all collectors
   - Expose as `window.__probe__`
   - Hierarchy methods (queryChildren, isEffectivelyVisible — already implemented)
   - `snapshot()` / `diff()`
   - `verifyLinkage()`

10. **integrations/playwright/src/inject.ts** — implement probe injection
    - `page.addInitScript()` with the built Web SDK

11. **integrations/playwright/src/probe-page.ts** — implement ProbePage
    - Wraps `page.evaluate(() => window.__probe__?.method())` for each API method

12. **integrations/playwright/src/matchers.ts** — already implemented

13. **Test with examples/web-react/**
    - Make the example actually runnable (add package.json with React + Vite)
    - Run Playwright tests against it
    - Verify all 6 primitives work

### Phase 2: Flutter SDK

14. **sdk/flutter/** — implement ProbeWidget, ProbeBinding, collectors
15. **integrations/flutter-test/** — implement ProbeTester
16. **Test with examples/flutter/** — make runnable, run flutter test

### Phase 3: iOS + Android

17. **sdk/ios/** — implement SwiftUI modifiers, ProbeRegistry
18. **integrations/xctest/** — implement ProbeXCTest
19. **sdk/android/** — implement Compose modifiers, ProbeRegistry
20. **integrations/compose-test/** — implement ProbeTestRule

### Phase 4: Windows + React Native + CLI

21. **sdk/windows-core/** + **sdk/windows-wpf/** + **sdk/windows-winform/** + **sdk/windows-winui/** — already scaffolded
22. **sdk/react-native/** — implement probeProps, bridge
23. **tools/cli/** — implement instrument, validate, report

### Phase 5: All Examples Runnable + Tests Pass

24. Make each example actually runnable with proper dependencies
25. Run tests for each platform that has toolchain available

## Key Design Decisions

- **Zero mock**: All tests connect to real dependencies. No mock servers.
- **Event-driven waits**: `waitForState()` / `waitForPageReady()` instead of `setTimeout()`
- **Smart pre-checks**: Every action validates element state before executing
- **Linkage auto-verify**: Actions automatically check linkage targets responded
- **Hierarchy-aware visibility**: `isEffectivelyVisible()` walks parent chain
- **Platform matrix**: `runAcrossDevices()` runs one test across multiple device profiles

## Available Toolchains (on this machine)

- Node 25 + npm 11 ✅
- Flutter 3.41 ✅
- Swift 6.2 + Xcode 26 ✅
- .NET: NOT available
- Android SDK: check with `flutter doctor`

## Related Project

This framework integrates with **myskills** plugins (separate repo at /Users/aa/Documents/myskills):
- testforge → generates tests using ProbeAPI instead of DOM selectors
- cr-visual → queries UI state instead of screenshot guessing
- dev-forge → auto-generates probe annotations in generated code
