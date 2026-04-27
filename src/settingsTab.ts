/** Settings tab UI for the Site2Vault plugin. */

import { PluginSettingTab, Setting, type App } from "obsidian";
import type Site2VaultPlugin from "./main";
import { DEFAULT_SETTINGS } from "./settings";
import { resolveBinary } from "./binary";

export class Site2VaultSettingsTab extends PluginSettingTab {
	constructor(app: App, private plugin: Site2VaultPlugin) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// ── Binary ──
		containerEl.createEl("h3", { text: "Binary" });

		new Setting(containerEl)
			.setName("Test binary")
			.setDesc("Verify site2vault is reachable")
			.addButton(btn => btn.setButtonText("Test").onClick(async () => {
				try {
					const path = await resolveBinary(
						this.plugin.settings.binaryPath,
						this.plugin.settings.autoDetectOnPath,
					);
					btn.setButtonText(`Found: ${path}`);
				} catch (e) {
					btn.setButtonText(e instanceof Error ? e.message : "Not found");
				}
			}));

		new Setting(containerEl)
			.setName("Binary path")
			.setDesc("Absolute path to site2vault executable. Leave empty to auto-detect on PATH.")
			.addText(text => text
				.setPlaceholder("/usr/local/bin/site2vault")
				.setValue(this.plugin.settings.binaryPath)
				.onChange(async (val) => {
					this.plugin.settings.binaryPath = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Auto-detect on PATH")
			.setDesc("Search system PATH for site2vault when no explicit path is set.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.autoDetectOnPath)
				.onChange(async (val) => {
					this.plugin.settings.autoDetectOnPath = val;
					await this.plugin.saveSettings();
				}));

		// ── Output defaults ──
		containerEl.createEl("h3", { text: "Output defaults" });

		new Setting(containerEl)
			.setName("Default output path")
			.setDesc("Base directory for vault output. Empty = vault root.")
			.addText(text => text
				.setValue(this.plugin.settings.defaultPath)
				.onChange(async (val) => {
					this.plugin.settings.defaultPath = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Default name template")
			.setDesc("Folder name template. Placeholders: {hostname}, {date}")
			.addText(text => text
				.setValue(this.plugin.settings.defaultNameTemplate)
				.onChange(async (val) => {
					this.plugin.settings.defaultNameTemplate = val;
					await this.plugin.saveSettings();
				}));

		// ── Crawl control ──
		containerEl.createEl("h3", { text: "Crawl control" });

		this.addNumberSetting(containerEl, "Default depth", "Maximum crawl depth.", "defaultDepth", 1, 100);
		this.addNumberSetting(containerEl, "Default max pages", "Maximum pages to crawl.", "defaultMaxPages", 1, 100000);
		this.addNumberSetting(containerEl, "Default timeout (minutes)", "Crawl timeout. 0 = no timeout.", "defaultTimeoutMinutes", 0, 1440, true);

		new Setting(containerEl)
			.setName("Default subdomain policy")
			.setDesc("strict = seed host only, include = include subdomains, any = any host")
			.addDropdown(dd => dd
				.addOptions({ strict: "strict", include: "include", any: "any" })
				.setValue(this.plugin.settings.defaultSubdomainPolicy)
				.onChange(async (val) => {
					this.plugin.settings.defaultSubdomainPolicy = val as "strict" | "include" | "any";
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Same domain only")
			.setDesc("Restrict crawl to same domain.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultSameDomain)
				.onChange(async (val) => {
					this.plugin.settings.defaultSameDomain = val;
					await this.plugin.saveSettings();
				}));

		this.addTextAreaSetting(containerEl, "Include regex patterns", "One regex per line. Only URLs matching these are crawled.", "defaultIncludeRegex");
		this.addTextAreaSetting(containerEl, "Exclude regex patterns", "One regex per line. URLs matching these are skipped.", "defaultExcludeRegex");

		// ── Politeness ──
		containerEl.createEl("h3", { text: "Politeness" });

		this.addNumberSetting(containerEl, "Rate (req/s)", "Requests per second.", "defaultRate", 0.1, 100);
		this.addNumberSetting(containerEl, "Concurrency", "Concurrent requests.", "defaultConcurrency", 1, 50);
		this.addNumberSetting(containerEl, "Jitter", "Random jitter (seconds).", "defaultJitter", 0, 10);
		this.addNumberSetting(containerEl, "Min delay", "Minimum delay between requests (seconds).", "defaultMinDelay", 0, 60);
		this.addNumberSetting(containerEl, "Max errors", "Max errors before stopping.", "defaultMaxErrors", 1, 1000);

		new Setting(containerEl)
			.setName("Ignore robots.txt")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultIgnoreRobots)
				.onChange(async (val) => {
					this.plugin.settings.defaultIgnoreRobots = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Render JavaScript")
			.setDesc("Use Playwright for JS-rendered pages. Requires playwright + chromium.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultRenderJs)
				.onChange(async (val) => {
					this.plugin.settings.defaultRenderJs = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("User agent")
			.setDesc("Custom user agent string. Empty = let binary decide.")
			.addText(text => text
				.setValue(this.plugin.settings.defaultUserAgent)
				.onChange(async (val) => {
					this.plugin.settings.defaultUserAgent = val;
					await this.plugin.saveSettings();
				}));

		// ── Output ──
		containerEl.createEl("h3", { text: "Output" });

		new Setting(containerEl)
			.setName("Flat output")
			.setDesc("All notes at vault root (no subfolders).")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultFlat)
				.onChange(async (val) => {
					this.plugin.settings.defaultFlat = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Link style")
			.addDropdown(dd => dd
				.addOptions({ shortest: "shortest", path: "path" })
				.setValue(this.plugin.settings.defaultLinkStyle)
				.onChange(async (val) => {
					this.plugin.settings.defaultLinkStyle = val as "shortest" | "path";
					await this.plugin.saveSettings();
				}));

		this.addTextAreaSetting(containerEl, "Tags", "One tag per line. Added to frontmatter.", "defaultTags");

		new Setting(containerEl)
			.setName("Title source")
			.addDropdown(dd => dd
				.addOptions({ auto: "auto", h1: "h1", url: "url" })
				.setValue(this.plugin.settings.defaultTitleFrom)
				.onChange(async (val) => {
					this.plugin.settings.defaultTitleFrom = val as "auto" | "h1" | "url";
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Skip manifest")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultNoManifest)
				.onChange(async (val) => {
					this.plugin.settings.defaultNoManifest = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Skip sitemap discovery")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultNoSitemap)
				.onChange(async (val) => {
					this.plugin.settings.defaultNoSitemap = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Skip static boilerplate stripping")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultNoStaticBoilerplate)
				.onChange(async (val) => {
					this.plugin.settings.defaultNoStaticBoilerplate = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Skip cross-page boilerplate detection")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultNoCrossPageBoilerplate)
				.onChange(async (val) => {
					this.plugin.settings.defaultNoCrossPageBoilerplate = val;
					await this.plugin.saveSettings();
				}));

		this.addNumberSetting(containerEl, "Boilerplate threshold", "Cross-page boilerplate threshold (0.0-1.0).", "defaultBoilerplateThreshold", 0, 1);

		// ── Resume ──
		containerEl.createEl("h3", { text: "Resume & Refresh" });

		new Setting(containerEl)
			.setName("Resume by default")
			.setDesc("Continue previous crawl if state exists.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultResume)
				.onChange(async (val) => {
					this.plugin.settings.defaultResume = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Force re-crawl")
			.setDesc("Ignore existing state and re-crawl from scratch.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultForce)
				.onChange(async (val) => {
					this.plugin.settings.defaultForce = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Prune on refresh")
			.setDesc("Delete notes whose source URLs return 404/410.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.defaultPrune)
				.onChange(async (val) => {
					this.plugin.settings.defaultPrune = val;
					await this.plugin.saveSettings();
				}));

		// ── Plugin behavior ──
		containerEl.createEl("h3", { text: "Plugin behavior" });

		this.addNumberSetting(containerEl, "Job queue max size", "0 = unlimited.", "jobQueueMaxSize", 0, 100);

		new Setting(containerEl)
			.setName("Show status bar")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (val) => {
					this.plugin.settings.showStatusBar = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Open log view on job start")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.openLogViewOnStart)
				.onChange(async (val) => {
					this.plugin.settings.openLogViewOnStart = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Kill child on Obsidian quit")
			.setDesc("Always true in v1. Detached mode deferred.")
			.addToggle(toggle => toggle
				.setValue(true)
				.setDisabled(true));

		new Setting(containerEl)
			.setName("On-disk log mirror")
			.setDesc("Save JSONL logs to disk for each run.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.onDiskLogMirror)
				.onChange(async (val) => {
					this.plugin.settings.onDiskLogMirror = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Log directory")
			.setDesc("Relative to vault root.")
			.addText(text => text
				.setValue(this.plugin.settings.onDiskLogDir)
				.onChange(async (val) => {
					this.plugin.settings.onDiskLogDir = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Verbose stderr capture")
			.setDesc("Forward stderr to console for debugging.")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.verboseStderrCapture)
				.onChange(async (val) => {
					this.plugin.settings.verboseStderrCapture = val;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName("Show resolved command in modal")
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.showResolvedCommandInModal)
				.onChange(async (val) => {
					this.plugin.settings.showResolvedCommandInModal = val;
					await this.plugin.saveSettings();
				}));
	}

	private addNumberSetting(
		container: HTMLElement,
		name: string,
		desc: string,
		key: keyof typeof DEFAULT_SETTINGS,
		min: number,
		max: number,
		nullable = false,
	): void {
		new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addText(text => {
				const current = this.plugin.settings[key];
				text.setValue(current === null ? "0" : String(current))
					.onChange(async (val) => {
						const num = parseFloat(val);
						if (!isNaN(num) && num >= min && num <= max) {
							(this.plugin.settings as unknown as Record<string, unknown>)[key] = nullable && num === 0 ? null : num;
							await this.plugin.saveSettings();
						}
					});
			});
	}

	private addTextAreaSetting(
		container: HTMLElement,
		name: string,
		desc: string,
		key: "defaultIncludeRegex" | "defaultExcludeRegex" | "defaultTags",
	): void {
		new Setting(container)
			.setName(name)
			.setDesc(desc)
			.addTextArea(ta => ta
				.setValue(this.plugin.settings[key].join("\n"))
				.onChange(async (val) => {
					this.plugin.settings[key] = val.split("\n").map(s => s.trim()).filter(Boolean);
					await this.plugin.saveSettings();
				}));
	}
}
