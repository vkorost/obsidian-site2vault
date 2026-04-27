/** JobModal: per-job configuration modal with URL, output path, and overrides. */

import { Modal, Setting, type App, type FileSystemAdapter } from "obsidian";
import type { Site2VaultSettings, JobRequest, JobMode } from "./types";
import { DEFAULT_SETTINGS } from "./settings";
import { buildArgv } from "./argv";

export interface ModalResult {
	request: JobRequest;
}

export class JobModal extends Modal {
	private url = "";
	private outPath: string;
	private name = "";
	private mode: JobMode;
	private overrides: Partial<Site2VaultSettings> = {};
	private onSubmit: ((result: ModalResult) => void) | null = null;
	private cmdPreviewEl: HTMLElement | null = null;
	private pathPreviewEl: HTMLElement | null = null;

	// Advanced fields
	private depth: number;
	private maxPages: number;
	private timeoutMinutes: number | null;
	private includeRegex: string[];
	private excludeRegex: string[];
	private tags: string[];
	private rate: number;
	private concurrency: number;
	private jitter: number;
	private flat: boolean;
	private ignoreRobots: boolean;
	private renderJs: boolean;
	private noResume: boolean;
	private force: boolean;
	private prune: boolean;

	constructor(
		app: App,
		private settings: Site2VaultSettings,
		mode: JobMode,
		onSubmit: (result: ModalResult) => void,
	) {
		super(app);
		this.mode = mode;
		this.onSubmit = onSubmit;

		const adapter = this.app.vault.adapter as FileSystemAdapter;
		const vaultRoot = adapter.getBasePath();
		this.outPath = settings.defaultPath || vaultRoot;
		this.depth = settings.defaultDepth;
		this.maxPages = settings.defaultMaxPages;
		this.timeoutMinutes = settings.defaultTimeoutMinutes;
		this.includeRegex = [...settings.defaultIncludeRegex];
		this.excludeRegex = [...settings.defaultExcludeRegex];
		this.tags = [...settings.defaultTags];
		this.rate = settings.defaultRate;
		this.concurrency = settings.defaultConcurrency;
		this.jitter = settings.defaultJitter;
		this.flat = settings.defaultFlat;
		this.ignoreRobots = settings.defaultIgnoreRobots;
		this.renderJs = settings.defaultRenderJs;
		this.noResume = !settings.defaultResume;
		this.force = settings.defaultForce;
		this.prune = settings.defaultPrune;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		const title = this.mode === "single" ? "Add single page" :
			this.mode === "refresh" ? "Refresh site" : "Mirror site to vault";
		contentEl.createEl("h2", { text: title });

		// ── Always visible fields ──
		new Setting(contentEl)
			.setName("URL")
			.addText(text => text
				.setPlaceholder("https://docs.example.com")
				.onChange(val => {
					this.url = val;
					this.name = this.resolveName();
					this.updatePreviews();
				}));

		new Setting(contentEl)
			.setName("Output path")
			.setDesc("Base directory for output.")
			.addText(text => text
				.setValue(this.outPath)
				.onChange(val => {
					this.outPath = val;
					this.updatePreviews();
				}));

		new Setting(contentEl)
			.setName("Folder name")
			.setDesc("Output folder name. Derived from URL if empty.")
			.addText(text => text
				.setValue(this.name)
				.onChange(val => {
					this.name = val;
					this.updatePreviews();
				}));

		// ── Advanced (collapsible) ──
		const details = contentEl.createEl("details");
		details.createEl("summary", { text: "Advanced options" });

		if (this.mode !== "single") {
			new Setting(details)
				.setName("Depth")
				.addText(text => text
					.setValue(String(this.depth))
					.onChange(val => {
						const n = parseInt(val);
						if (!isNaN(n) && n > 0) {
							this.depth = n;
							this.overrides.defaultDepth = n;
							this.updatePreviews();
						}
					}));

			new Setting(details)
				.setName("Max pages")
				.addText(text => text
					.setValue(String(this.maxPages))
					.onChange(val => {
						const n = parseInt(val);
						if (!isNaN(n) && n > 0) {
							this.maxPages = n;
							this.overrides.defaultMaxPages = n;
							this.updatePreviews();
						}
					}));
		}

		new Setting(details)
			.setName("Timeout (minutes)")
			.setDesc("0 = no timeout")
			.addText(text => text
				.setValue(this.timeoutMinutes === null ? "0" : String(this.timeoutMinutes))
				.onChange(val => {
					const n = parseInt(val);
					this.timeoutMinutes = isNaN(n) || n <= 0 ? null : n;
					this.overrides.defaultTimeoutMinutes = this.timeoutMinutes;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("Include regex (one per line)")
			.addTextArea(ta => ta
				.setValue(this.includeRegex.join("\n"))
				.onChange(val => {
					this.includeRegex = val.split("\n").filter(Boolean);
					this.overrides.defaultIncludeRegex = this.includeRegex;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("Exclude regex (one per line)")
			.addTextArea(ta => ta
				.setValue(this.excludeRegex.join("\n"))
				.onChange(val => {
					this.excludeRegex = val.split("\n").filter(Boolean);
					this.overrides.defaultExcludeRegex = this.excludeRegex;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("Tags (one per line)")
			.addTextArea(ta => ta
				.setValue(this.tags.join("\n"))
				.onChange(val => {
					this.tags = val.split("\n").filter(Boolean);
					this.overrides.defaultTags = this.tags;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("Rate (req/s)")
			.addText(text => text
				.setValue(String(this.rate))
				.onChange(val => {
					const n = parseFloat(val);
					if (!isNaN(n) && n > 0) {
						this.rate = n;
						this.overrides.defaultRate = n;
						this.updatePreviews();
					}
				}));

		new Setting(details)
			.setName("Concurrency")
			.addText(text => text
				.setValue(String(this.concurrency))
				.onChange(val => {
					const n = parseInt(val);
					if (!isNaN(n) && n > 0) {
						this.concurrency = n;
						this.overrides.defaultConcurrency = n;
						this.updatePreviews();
					}
				}));

		new Setting(details)
			.setName("Jitter")
			.addText(text => text
				.setValue(String(this.jitter))
				.onChange(val => {
					const n = parseFloat(val);
					if (!isNaN(n) && n >= 0) {
						this.jitter = n;
						this.overrides.defaultJitter = n;
						this.updatePreviews();
					}
				}));

		new Setting(details)
			.setName("Flat output")
			.addToggle(toggle => toggle
				.setValue(this.flat)
				.onChange(val => {
					this.flat = val;
					this.overrides.defaultFlat = val;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("Ignore robots.txt")
			.addToggle(toggle => toggle
				.setValue(this.ignoreRobots)
				.onChange(val => {
					this.ignoreRobots = val;
					this.overrides.defaultIgnoreRobots = val;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("Render JavaScript")
			.addToggle(toggle => toggle
				.setValue(this.renderJs)
				.onChange(val => {
					this.renderJs = val;
					this.overrides.defaultRenderJs = val;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("No resume")
			.addToggle(toggle => toggle
				.setValue(this.noResume)
				.onChange(val => {
					this.noResume = val;
					this.overrides.defaultResume = !val;
					this.updatePreviews();
				}));

		new Setting(details)
			.setName("Force re-crawl")
			.addToggle(toggle => toggle
				.setValue(this.force)
				.onChange(val => {
					this.force = val;
					this.overrides.defaultForce = val;
					this.updatePreviews();
				}));

		if (this.mode === "refresh") {
			new Setting(details)
				.setName("Prune deleted pages")
				.addToggle(toggle => toggle
					.setValue(this.prune)
					.onChange(val => {
						this.prune = val;
						this.overrides.defaultPrune = val;
						this.updatePreviews();
					}));
		}

		// ── Resolved path ──
		contentEl.createEl("h4", { text: "Resolved path" });
		this.pathPreviewEl = contentEl.createEl("pre", { cls: "s2v-resolved-cmd" });

		// ── Command preview ──
		if (this.settings.showResolvedCommandInModal) {
			contentEl.createEl("h4", { text: "Resolved command" });
			this.cmdPreviewEl = contentEl.createEl("pre", { cls: "s2v-resolved-cmd" });
		}

		this.updatePreviews();

		if (this.settings.showResolvedCommandInModal) {
			new Setting(contentEl)
				.addButton(btn => btn.setButtonText("Copy to clipboard").onClick(() => {
					if (this.cmdPreviewEl) {
						navigator.clipboard.writeText(this.cmdPreviewEl.textContent ?? "");
					}
				}));
		}

		// ── Action buttons ──
		const actions = contentEl.createDiv({ cls: "s2v-modal-actions" });

		const runBtn = actions.createEl("button", { text: "Run", cls: "mod-cta" });
		runBtn.addEventListener("click", () => {
			if (!this.url.trim()) return;
			const request: JobRequest = {
				url: this.normalizeUrl(this.url),
				outPath: this.outPath,
				name: this.name || this.resolveName(),
				mode: this.mode,
				overrides: this.overrides,
			};
			this.onSubmit?.({ request });
			this.close();
		});

		const cancelBtn = actions.createEl("button", { text: "Cancel" });
		cancelBtn.addEventListener("click", () => this.close());
	}

	private resolveName(): string {
		if (!this.url) return "";
		const template = this.settings.defaultNameTemplate;
		try {
			const normalized = this.normalizeUrl(this.url);
			const hostname = new URL(normalized).hostname;
			return template
				.replace("{hostname}", hostname)
				.replace("{date}", new Date().toISOString().slice(0, 10));
		} catch {
			return this.url;
		}
	}

	private normalizeUrl(url: string): string {
		if (!/^https?:\/\//i.test(url)) {
			return "https://" + url;
		}
		return url;
	}

	private resolvedName(): string {
		return this.name || this.resolveName();
	}

	private updatePreviews(): void {
		const folderName = this.resolvedName();

		// Resolved path
		if (this.pathPreviewEl) {
			if (folderName) {
				const sep = this.outPath.includes("\\") ? "\\" : "/";
				this.pathPreviewEl.textContent = this.outPath + sep + folderName;
			} else {
				this.pathPreviewEl.textContent = this.outPath || "...";
			}
		}

		// Resolved command
		if (this.cmdPreviewEl) {
			if (!this.url.trim()) {
				this.cmdPreviewEl.textContent = "site2vault ...";
				return;
			}

			const request: JobRequest = {
				url: this.normalizeUrl(this.url),
				outPath: this.outPath,
				name: folderName,
				mode: this.mode,
				overrides: this.overrides,
			};

			const argv = buildArgv(this.settings, request);
			const quoted = argv.map(a => /[\s"'\\]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
			this.cmdPreviewEl.textContent = "site2vault " + quoted.join(" ");
		}
	}
}
