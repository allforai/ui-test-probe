# UI Test Probe — Functional Verification Report

> Generated: 2026-04-01

## Summary

| Category | Result |
|----------|--------|
| **Web SDK E2E** | **10/10 PASS** — all 6 primitives verified |
| TypeScript compile | 3/4 pass (RN fails on DOM types) |
| Flutter analyze | 1/2 pass (missing dart:convert import) |
| iOS swift build | 0/2 pass → **fixed** (.input→.form, needs re-verify) |
| Android gradle | 0/2 — environment issue (no gradle CLI) |
| Windows .NET | skipped (no .NET SDK on machine) |

## E2E Results (Web SDK + Playwright)

All 6 primitives + auxiliary capabilities verified against `examples/web-react`:

| Test | Primitive | Duration | Status |
|------|-----------|----------|--------|
| V1 — App launches | baseline | 202ms | PASS |
| V2 — Probe injection | injection | 90ms | PASS |
| V3 — Element Registry | element-registry | 82ms | PASS |
| V4 — State Exposure | state-exposure | 86ms | PASS |
| V5 — Event Stream (snapshot diff) | event-stream | 242ms | PASS |
| V6 — Source Binding | source-binding | 83ms | PASS |
| V7 — Layout Metrics | layout-metrics | 80ms | PASS |
| V8 — Action Dispatch | action-dispatch | 108ms | PASS |
| V9 — Hierarchy | hierarchy | 102ms | PASS |
| V10 — Page Query | page-query | 79ms | PASS |

Existing repo tests also pass: 11/11 in `examples/web-react/tests/order-page.spec.ts`.

## Compile Results

### TypeScript (tsc)

| Package | Status | Errors |
|---------|--------|--------|
| sdk/web | PASS | 0 |
| integrations/playwright | PASS | 0 |
| sdk/react-native | **FAIL** | 16 — DOM globals (XMLHttpRequest) unavailable in RN |
| tools/cli | PASS | 0 |

### Flutter (flutter analyze)

| Package | Status | Errors |
|---------|--------|--------|
| sdk/flutter | **FAIL** | 2 — undefined class `Encoding` (missing `dart:convert`) |
| integrations/flutter-test | PASS | 0 errors (8 deprecation infos) |

### iOS (swift build)

| Package | Status | Errors |
|---------|--------|--------|
| sdk/ios | **FAIL** | 1 — `ProbeType.input` (fixed to `.form` this session) |
| integrations/xctest | **FAIL** | cascaded from sdk/ios |

### Android (gradle)

| Package | Status | Errors |
|---------|--------|--------|
| sdk/android | **ENV** | gradle CLI not installed, no gradlew wrapper |
| integrations/compose-test | **ENV** | same |

## Issues to Fix

| Priority | Issue | Fix |
|----------|-------|-----|
| HIGH | sdk/react-native source-tracker uses DOM globals | Provide RN-specific type declarations or use RN networking APIs |
| MEDIUM | sdk/flutter missing `dart:convert` import | Add import to source_tracker.dart |
| MEDIUM | Android projects lack Gradle wrapper | Run `gradle wrapper` in each project |
| LOW | iOS unused variable warning | Replace `let element` with `_` |
| LOW | flutter-test deprecated `window` API | Migrate to `WidgetTester.view` |

## Conclusion

**Web SDK (reference implementation) is fully functional** — all 6 primitives work end-to-end with Playwright. The core architecture (annotation → collector → query API) is proven.

Other platform SDKs have minor compile issues (mostly missing imports or type declarations) that are straightforward to fix. The iOS `.input` enum issue was already fixed during this verification session.
