# Architecture

## Overview

The Site2Vault Obsidian plugin is a thin UI wrapper around the `site2vault` Python CLI. All crawling, extraction, and file writing happens in the binary. The plugin handles:

- Settings persistence and UI
- Child process lifecycle (spawn, JSONL streaming, kill)
- Live log view with filtering
- Job queue (FIFO, one at a time)
- Status bar
- Command palette integration

## Module Map

```
src/
├── main.ts          Plugin entry point, wires all modules
├── types.ts         All shared interfaces and types
├── settings.ts      DEFAULT_SETTINGS, migration helper
├── settingsTab.ts   PluginSettingTab UI
├── commands.ts      Command palette registration
├── modal.ts         JobModal (per-job overrides, path + command preview)
├── binary.ts        Binary resolution (explicit path or PATH search)
├── argv.ts          Pure: settings + overrides -> argv array
├── runner.ts        JobRunner (child_process.spawn, stdout/stderr)
├── queue.ts         JobQueue (FIFO, orchestrates runner lifecycle)
├── jsonl.ts         Pure: line buffer + JSON event parser
├── logStore.ts      Ring buffer (500 entries) + counters
├── logFile.ts       On-disk JSONL mirror
├── logView.ts       ItemView for live log display
├── statusBar.ts     Status bar item
├── notices.ts       Notice helpers
└── exit.ts          Pure: exit code -> outcome
```

## Data Flow

```
User -> Modal -> JobQueue -> JobRunner -> child_process.spawn(site2vault)
                                              |
                                  stdout (JSONL) -> LineBuffer -> parseEvent
                                              |                       |
                                              |                  LogStore (ring buffer)
                                              |                       |
                                              |                  LogView (ItemView)
                                              |                  StatusBar
                                              |                  LogFileMirror
                                              |
                                  exit code -> describeExit -> Notice
```

## Key Design Decisions

1. **No crawl logic in TypeScript**: The binary owns all networking. The plugin is a process manager.
2. **Pure functions for testable logic**: argv builder, JSONL parser, exit mapping are all pure and tested with Vitest.
3. **Ring buffer**: Log view caps at 500 DOM rows for performance. On-disk mirror captures everything.
4. **requestAnimationFrame batching**: Store notifications within 16ms are coalesced into a single render.
5. **Never `shell: true`**: All process spawning uses array argv to prevent injection.
