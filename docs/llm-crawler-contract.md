# LLM Crawler Contract

Source-first contract for agents that read this repository to determine what already exists before proposing new features.

## Entrypoints

1. `spw.index.json` (machine-readable inventory)
2. `spw.index.spw` (Spw-native feature inventory)
3. `.spw/workspace.spw` (kernel/layers/relationship framing)
4. `src/core/runtime/js/boot.js` and `src/core/runtime/js/runtime-control.js` (actual runtime orchestration and control surfaces)
5. `manifest.webmanifest`, `sw.js`, and `src/core/runtime/js/pwa.js` (installability and release-cache behavior)
6. `src/runtime/index.js` and `assets.manifest.json` (embedded/runtime-package and asset handoff contracts)

## Workspace Control Plane

`.spw/` is intentionally present so editor/LSP tooling can infer roots, topology, and categories from source:

- `.spw/shelves.spw`
- `.spw/topology.spw`
- `.spw/editing.spw`
- `.spw/workspace.spw`
- `.spw/index.spw`

These files are authored to match parser patterns used in the workbench LSP server (`server-index.ts`) so code lens and category/plane inference can project to this repo.

## Feature Claim Shape

Every feature claim should be representable as:

- `id`
- `route`/scope
- one Spw contract form
- pointer list of implementation files

Avoid speculative roadmap claims inside the crawler index; only include shipped behavior.

## Tooling Care Map (Workbench References)

### LSP
- `seed/extern/spw-workbench/scripts/lsp/stdio-server.ts`
- `seed/extern/spw-workbench/scripts/lsp/server-index.ts`
- `seed/extern/spw-workbench/scripts/lsp/smoke-navigation.ts`
- `seed/extern/spw-workbench/docs/runtime/md/lsp-editor-integration.md`

### Neovim
- `seed/extern/spw-workbench/extensions/neovim-spw/lua/spw-lsp.lua`
- `seed/extern/spw-workbench/extensions/neovim-spw/README.md`

### VS Code
- `seed/extern/spw-workbench/extensions/vscode-spw/src/extension.ts`
- `seed/extern/spw-workbench/extensions/vscode-spw/src/roots.ts`
- `seed/extern/spw-workbench/extensions/vscode-spw/src/semantics.ts`

### IntelliJ
- `seed/extern/spw-workbench/extensions/intellij-spw/src/main/kotlin/com/spwashi/spw/SpwLspServerSupportProvider.kt`

### History / Design Lineage
- `seed/extern/spw-workbench/docs/design/md/history.md`
- `seed/extern/spw-workbench/docs/archive/status/md/vim-implementation-complete.md`
- `seed/extern/spw-workbench/docs/audits/md/vim-keybindings-inconsistencies-audit.md`

## Runtime Access

Use `window.__SPW_RUNTIME__.getCatalog()` for runtime-readable feature inventory:

- `getCatalog({ summaryOnly: true })` for small payload
- `run('catalog', { summaryOnly: true })` for command-style access
- `run('integration')` to inspect parser bridge + embed/runtime + host settings
- `run('contract')` / `run('interfaces')` to inspect runtime API version + interface map
- `run('hostManifest')` / `run('theme')` to inspect host overlay + active combinatoric theme rules
- `evalSpw('!top{ route:work clicks:9 profile:field llm:true }')` for Spw-native control execution
- `run('spw', { expression: '!region{ selector:.chapter-panel attr.data-state:active }' })` for command-router parity

## Crawler Prompt Seed

Use this pattern when asking an agent what to build next:

`!ask[feature-gap]{ compare:shipped-features wanted:project-goals output:ranked-next-features }`
