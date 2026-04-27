# Installation & Configuration

## Prerequisites

- **Obsidian 1.5.0+** (desktop only)
- **site2vault CLI** — the Python binary that performs the actual crawling

### Installing the CLI

Via pipx (recommended):

```bash
pipx install site2vault
```

Via pip:

```bash
pip install site2vault
```

Or download the standalone Windows executable from [site2vault/dist](https://github.com/vkorost/site2vault).

## Plugin Installation

### Via BRAT

1. Install [BRAT](https://github.com/TfTHacker/obsidian42-brat) in Obsidian.
2. In BRAT settings, click **Add Beta Plugin**.
3. Paste: `vkorost/obsidian-site2vault`
4. Enable **Site2Vault** in Settings > Community Plugins.

### Manual

1. Download `main.js`, `manifest.json`, and `styles.css` from a release.
2. Place them in `<vault>/.obsidian/plugins/site2vault/`.
3. Enable the plugin.

## Settings Reference

### Binary

| Setting | Default | Description |
|---|---|---|
| Binary path | (empty) | Absolute path to site2vault. Empty = auto-detect. |
| Auto-detect on PATH | true | Search PATH for site2vault when no explicit path set. |

### Output defaults

| Setting | Default | Description |
|---|---|---|
| Default path | (empty) | Base output directory. Empty = vault root. |
| Default name template | `{hostname}` | Folder name. Placeholders: `{hostname}`, `{date}`. |

### Crawl control

| Setting | Default | Description |
|---|---|---|
| Depth | 3 | Maximum crawl depth. |
| Max pages | 2000 | Maximum pages to crawl. |
| Timeout | 0 (none) | Crawl timeout in minutes. |
| Subdomain policy | include | `strict` / `include` / `any` |
| Same domain | true | Restrict to seed domain. |
| Include regex | (none) | Only crawl URLs matching these patterns. |
| Exclude regex | (none) | Skip URLs matching these patterns. |

### Politeness

| Setting | Default | Description |
|---|---|---|
| Rate | 1.0 | Requests per second. |
| Concurrency | 2 | Concurrent requests. |
| Jitter | 0.3 | Random delay variance (seconds). |
| Min delay | 0.5 | Minimum inter-request delay. |
| Max errors | 10 | Stop after this many errors. |
| Ignore robots.txt | false | Override robots.txt restrictions. |
| Render JavaScript | false | Use Playwright for JS-rendered pages. |
| User agent | (empty) | Custom user agent. |

### Output

| Setting | Default | Description |
|---|---|---|
| Flat | false | All notes at vault root. |
| Link style | shortest | `shortest` or `path` for wikilinks. |
| Tags | (none) | Obsidian tags added to frontmatter. |
| Title source | auto | `auto`, `h1`, or `url`. |
| No manifest | false | Skip manifest.json generation. |
| No sitemap | false | Skip sitemap discovery. |
| No static boilerplate | false | Skip static boilerplate stripping. |
| No cross-page boilerplate | false | Skip cross-page detection. |
| Boilerplate threshold | 0.5 | Detection threshold (0.0-1.0). |

### Resume & Refresh

| Setting | Default | Description |
|---|---|---|
| Resume | true | Continue previous crawl. |
| Force | false | Ignore existing state. |
| Prune | false | Delete notes for 404/410 URLs on refresh. |

### Plugin behavior

| Setting | Default | Description |
|---|---|---|
| Queue max size | 10 | Max pending jobs. 0 = unlimited. |
| Show status bar | true | Show crawl status in status bar. |
| Open log on start | false | Auto-open log view when a job starts. |
| On-disk log mirror | true | Write JSONL logs to disk. |
| Log directory | `.site2vault-plugin/runs` | Relative to vault root. |
| Verbose stderr | false | Forward stderr to console. |
| Show command in modal | true | Show resolved CLI command in modal. |

## Modal Reference

The job modal (opened via any of the crawl commands) has:

### Always visible

- **URL** — the seed URL to crawl (auto-prepends `https://` if no scheme)
- **Output path** — base directory for output
- **Folder name** — output folder name (auto-derived from URL hostname if empty)

### Advanced options (collapsible)

- Depth, max pages, timeout
- Include/exclude regex patterns
- Tags
- Rate, concurrency, jitter
- Flat output, ignore robots.txt, render JavaScript
- No resume, force re-crawl, prune (refresh mode only)

### Previews

- **Resolved path** — shows the full output directory (output path + folder name)
- **Resolved command** — shows the exact CLI command that will be executed (with copy button)
