# Site2Vault

Mirror websites into your Obsidian vault as linked Markdown notes.

## What it does

Site2Vault is an Obsidian plugin that wraps the [site2vault](https://github.com/vkorost/site2vault) Python CLI. It spawns crawls as child processes, streams live progress into an Obsidian log view, and exposes every CLI flag through a settings tab and per-job modal. No crawl logic runs in the plugin itself — the binary handles all fetching, parsing, and writing.

## Requirements

- Obsidian 1.5.0 or later (desktop only — mobile cannot spawn child processes)
- The `site2vault` CLI binary installed and accessible on PATH, or pointed to in plugin settings

Install the CLI:

```bash
pipx install site2vault
```

Or download the standalone Windows executable from the [site2vault releases](https://github.com/vkorost/site2vault).

## Installation

### Via BRAT (recommended)

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) community plugin in Obsidian.
2. In BRAT settings, click **Add Beta Plugin**.
3. Paste: `vkorost/obsidian-site2vault`
4. Enable **Site2Vault** in Community Plugins.
5. In Site2Vault settings, verify the binary is detected (or set the path manually).

### Manual install

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create `<vault>/.obsidian/plugins/site2vault/` and place the three files there.
3. Enable **Site2Vault** in Community Plugins.

## Quick start

1. Open the command palette (`Ctrl+P`) and run **Site2Vault: Mirror site to vault**.
2. Enter a URL (e.g. `docs.example.com`).
3. Set the **Output path** (base directory) and **Folder name** (output folder within that directory).
4. The **Resolved path** preview at the bottom shows the full output directory.
5. Expand **Advanced options** to adjust depth, max pages, rate limiting, and other crawl settings.
6. Click **Run**. The modal closes and the crawl starts in the background.

### Viewing progress

After clicking Run, you can monitor the crawl in several ways:

- **Log view:** Open the command palette (`Ctrl+P`) → **Site2Vault: Open Site2Vault log**. This opens a live log panel in the right sidebar showing fetched pages, errors, and written notes.
- **Ribbon icon:** Click the cloud-download icon in the left sidebar to open the log view.
- **Status bar:** The bottom of the Obsidian window shows crawl status (phase, pages fetched, errors, queue size).

**Tip:** Enable **Open log view on job start** in Site2Vault settings to automatically open the log panel whenever a crawl starts.

When the crawl completes, a notice appears. The mirrored notes are in your vault with `[[wikilinks]]` connecting them.

## Settings overview

All `site2vault` CLI flags are exposed in the plugin settings tab, grouped by category:

- **Binary** — path to executable, auto-detection
- **Crawl control** — depth, max pages, timeout, include/exclude patterns, subdomain policy
- **Politeness** — rate, concurrency, jitter, robots.txt
- **Output** — flat mode, link style, tags, title source, boilerplate settings
- **Resume & Refresh** — resume, force, prune
- **Plugin behavior** — queue size, status bar, log mirroring

See [docs/INSTALL.md](docs/INSTALL.md) for the full settings reference and [docs/USER_GUIDE.md](docs/USER_GUIDE.md) for a step-by-step walkthrough with screenshots.

## Commands

| Command | Description |
|---|---|
| Mirror site to vault | Open modal to configure and start a full site crawl |
| Add single page to vault | Capture a single URL |
| Refresh previously crawled site | Re-crawl an existing site with conditional GET |
| Cancel running Site2Vault job | Send SIGTERM to the active crawl |
| Open Site2Vault log | Show the live log view |

## Troubleshooting

### Binary not found

The plugin checks for `site2vault` on your PATH at startup. If not found, a persistent notice appears. Fix by either:
- Installing via `pipx install site2vault`
- Setting the absolute path in plugin settings

### Partial success (exit code 2)

The crawl completed but some hosts hit rate limits or anti-bot detection. Check the log for details. The successfully crawled pages are still written.

### Resume conflict (exit code 4)

An existing crawl state has different configuration. Enable **Force** in the modal's advanced options to override, or delete the `log/site2vault.sqlite` file in the output folder.

## License

MIT. See [LICENSE](LICENSE).
