---
node: discover-codebase
exit_artifacts:
  - .allforai/product-map/source-summary.json
  - .allforai/product-map/file-catalog.json
  - .allforai/product-map/infrastructure-profile.json
---

# Task: Discover and catalog the ui-test-probe codebase

Scan all 15 modules across 7 platforms in this cross-platform SDK monorepo. Produce a complete inventory of the project structure, tech stacks, implementation state, and key files.

## Project Context

- **Type**: Cross-platform UI test observability framework (SDK/Library archetype)
- **Architecture**: Modular SDK monorepo — shared spec + 6 per-platform SDKs + 6 per-platform test integrations + CLI + 8 examples
- **Languages**: TypeScript, Dart, Swift, Kotlin, C#
- **Reference implementation**: sdk/web/ (TypeScript, most complete)
- **Other SDKs**: Scaffolded with type definitions + stub implementations

## Theory Anchors

- **Breadth first, depth second**: Scan directory tree before reading file internals
- **Infrastructure before business**: Understand runtime foundation (build tools, dependencies, test setup) before business logic (SDK primitives)
- **Never skip by name**: Can't guess importance from filename — sample-read first
- **Config is code**: tsconfig.json, build.gradle.kts, pubspec.yaml contain architectural decisions

## Guidance

### What to discover

1. **Per-module inventory**: For each of the 15 modules (spec/, sdk/web, sdk/flutter, sdk/ios, sdk/android, sdk/windows, sdk/react-native, integrations/playwright, integrations/flutter-test, integrations/xctest, integrations/compose-test, integrations/winui-test, integrations/detox, tools/cli, examples/):
   - Language + framework + version
   - Package manager + build tool
   - File count and key files (entry points, type definitions, implementations)
   - Implementation state: "complete" / "partial" / "stub" / "scaffold-only"
   - Dependencies (both declared and actual imports)

2. **Architecture pattern**: Document the two-layer architecture (annotation + runtime collector), the 6 primitives composition pattern, and the shared spec → per-platform SDK relationship.

3. **Cross-cutting concerns**: How types flow from spec/ to each SDK. How integrations wrap SDKs. How examples consume SDKs.

4. **Implementation depth assessment**: For each source file in sdk/web/ (the reference implementation), classify as:
   - Fully implemented (real logic, not stubs)
   - Partially implemented (some methods real, some throw NotImplementedError)
   - Stub only (all methods throw or are empty)

5. **Infrastructure**: No backend services. Focus on build infrastructure: TypeScript compilation, esbuild bundling, Flutter/Xcode/Gradle build chains.

### SDK-specific discovery focus (from domains/sdk.md)

- Public API surface: What interfaces/types are exported?
- Test suite: What test infrastructure exists?
- Documentation: README quality, inline docs, examples coverage
- Examples: Are they runnable or reference-only?

### Quality bar

- File coverage >= 50% per module (header scan for uncovered files)
- Every module has a clear implementation state classification
- Key architectural decisions documented (why shared spec? why this composition pattern?)

## Exit Artifacts

### `.allforai/product-map/source-summary.json`
Module inventory with tech stacks, implementation state, and architecture pattern.

```json
{
  "generated_at": "<ISO timestamp>",
  "architecture": { "pattern": "...", "description": "...", "key_decisions": [...] },
  "modules": [
    {
      "id": "M001",
      "path": "spec/",
      "language": "TypeScript",
      "framework": null,
      "implementation_state": "complete",
      "file_count": 4,
      "key_files": ["probe-types.ts", "probe-api.schema.json", "probe-element.schema.json", "devices.json"],
      "description": "..."
    }
  ],
  "cross_cutting": { "type_flow": "...", "dependency_graph": "..." }
}
```

### `.allforai/product-map/file-catalog.json`
Key files per module with business intent.

```json
{
  "generated_at": "<ISO timestamp>",
  "files": [
    {
      "path": "spec/probe-types.ts",
      "module": "M001",
      "business_intent": "Authoritative type definitions for all 15 element attributes, 9 probe types, 6 linkage paths",
      "implementation_state": "complete",
      "exports": ["ProbeType", "ProbeElement", "UITestProbe", "..."]
    }
  ]
}
```

### `.allforai/product-map/infrastructure-profile.json`
Build infrastructure, dependencies, and toolchain requirements.

```json
{
  "generated_at": "<ISO timestamp>",
  "build_tools": [...],
  "package_managers": [...],
  "ci_cd": null,
  "containerization": null,
  "required_toolchains": [
    { "tool": "Node.js", "version": ">=18", "modules": ["M002", "M008", "M014"] },
    { "tool": "Flutter", "version": ">=3.41", "modules": ["M003", "M009"] }
  ]
}
```

## Downstream Contract

→ **analyze-sdk-design** reads:
  - `source-summary.json`: modules[].implementation_state (to know which SDKs to analyze deeply vs skim), architecture.key_decisions (to understand API philosophy choices)
  - `file-catalog.json`: files where implementation_state="complete" (to read actual API implementations for reverse-engineering)

→ **generate-artifacts** reads:
  - `source-summary.json`: full module inventory (to build product-map.json)
  - `file-catalog.json`: all exported types/interfaces (to build entity-model.json)
  - `infrastructure-profile.json`: toolchain requirements (for product-map metadata)
