import { Plugin, type FileSystemAdapter, type WorkspaceLeaf } from "obsidian";
import type { Site2VaultSettings, JobRequest } from "./types";
import { DEFAULT_SETTINGS } from "./settings";
import { Site2VaultSettingsTab } from "./settingsTab";
import { LogStore } from "./logStore";
import { JobQueue } from "./queue";
import { StatusBar } from "./statusBar";
import { LogView, VIEW_TYPE_S2V_LOG } from "./logView";
import { registerCommands } from "./commands";
import { resolveBinary, BinaryNotFoundError } from "./binary";
import { noticeError } from "./notices";

export default class Site2VaultPlugin extends Plugin {
	settings: Site2VaultSettings = { ...DEFAULT_SETTINGS };
	logStore = new LogStore();
	private queue!: JobQueue;
	private statusBar: StatusBar | null = null;
	private logFilePath: string | null = null;
	private beforeUnloadHandler: (() => void) | null = null;

	async onload(): Promise<void> {
		await this.loadSettings();

		// Defensive check: must be FileSystemAdapter (desktop only)
		if (!("getBasePath" in this.app.vault.adapter)) {
			noticeError("Site2Vault requires a desktop filesystem adapter. Plugin disabled.");
			return;
		}

		// Queue
		this.queue = new JobQueue(this.settings, this.logStore, {
			openLogView: () => this.activateLogView(),
			openNote: (path) => this.app.workspace.openLinkText(path, ""),
			getAdapter: () => this.app.vault.adapter as FileSystemAdapter,
			nudgeVault: (folder) => {
				// Nudge Obsidian to pick up new files
				const adapter = this.app.vault.adapter as FileSystemAdapter;
				adapter.list(folder).catch(() => {});
			},
		});

		// Register log view
		this.registerView(VIEW_TYPE_S2V_LOG, (leaf) =>
			new LogView(
				leaf,
				this.logStore,
				() => this.queue.getState(),
				() => this.queue.cancelCurrent(),
				() => this.queue.cancelAll(),
				() => this.logFilePath,
			),
		);

		// Ribbon icon
		this.addRibbonIcon("download-cloud", "Open Site2Vault log", () => {
			this.activateLogView();
		});

		// Settings tab
		this.addSettingTab(new Site2VaultSettingsTab(this.app, this));

		// Commands
		registerCommands(this);

		// Status bar
		if (this.settings.showStatusBar) {
			this.statusBar = new StatusBar(
				this,
				this.logStore,
				() => this.queue.getState(),
				() => this.activateLogView(),
			);
			this.statusBar.enable();
		}

		// Safety net: kill child processes when Obsidian window closes
		this.beforeUnloadHandler = () => this.queue?.killAllSync();
		window.addEventListener("beforeunload", this.beforeUnloadHandler);

		// Check binary on load
		this.checkBinaryOnLoad();
	}

	onunload(): void {
		if (this.beforeUnloadHandler) {
			window.removeEventListener("beforeunload", this.beforeUnloadHandler);
			this.beforeUnloadHandler = null;
		}
		this.queue?.killAllSync();
		this.statusBar?.disable();
	}

	async loadSettings(): Promise<void> {
		const data: Partial<Site2VaultSettings> | null = await this.loadData() as Partial<Site2VaultSettings> | null;
		this.settings = { ...DEFAULT_SETTINGS, ...data };
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.queue?.updateSettings(this.settings);
	}

	enqueueJob(request: JobRequest): void {
		if (this.settings.openLogViewOnStart) {
			this.activateLogView();
		}
		this.queue.enqueue(request);
	}

	cancelCurrentJob(): void {
		this.queue.cancelCurrent();
	}

	async activateLogView(): Promise<void> {
		const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_S2V_LOG);
		if (existing.length > 0) {
			this.app.workspace.revealLeaf(existing[0]!);
			return;
		}
		const leaf: WorkspaceLeaf = this.app.workspace.getRightLeaf(false)!;
		await leaf.setViewState({ type: VIEW_TYPE_S2V_LOG, active: true });
		this.app.workspace.revealLeaf(leaf);
	}

	private async checkBinaryOnLoad(): Promise<void> {
		try {
			await resolveBinary(this.settings.binaryPath, this.settings.autoDetectOnPath);
		} catch (e) {
			if (e instanceof BinaryNotFoundError) {
				noticeError(e.message, {
					text: "Open settings",
					onClick: () => {
						// Open plugin settings
						(this.app as unknown as { setting: { open: () => void; openTabById: (id: string) => void } })
							.setting?.open();
					},
				});
			}
		}
	}
}
