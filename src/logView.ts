/** LogView: ItemView showing live crawl progress. */

import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { LogStore } from "./logStore";
import type { LogEntry, LogLevel, QueueState } from "./types";

export const VIEW_TYPE_S2V_LOG = "site2vault-log";

type LevelFilter = "all" | "errors" | "writes" | "no-muted";

export class LogView extends ItemView {
	private logStore: LogStore;
	private getQueueState: () => QueueState;
	private onCancel: () => void;
	private onCancelAll: () => void;
	private getLogFilePath: () => string | null;

	private unsub: (() => void) | null = null;
	private rafId: number | null = null;
	private dirty = false;
	private autoScroll = true;
	private filterText = "";
	private levelFilter: LevelFilter = "all";

	// DOM refs
	private headerEl!: HTMLElement;
	private filterEl!: HTMLInputElement;
	private levelSelectEl!: HTMLSelectElement;
	private autoScrollEl!: HTMLInputElement;
	private actionBar!: HTMLElement;
	private logContainer!: HTMLElement;
	private footerEl!: HTMLElement;

	constructor(
		leaf: WorkspaceLeaf,
		logStore: LogStore,
		getQueueState: () => QueueState,
		onCancel: () => void,
		onCancelAll: () => void,
		getLogFilePath: () => string | null,
	) {
		super(leaf);
		this.logStore = logStore;
		this.getQueueState = getQueueState;
		this.onCancel = onCancel;
		this.onCancelAll = onCancelAll;
		this.getLogFilePath = getLogFilePath;
	}

	getViewType(): string {
		return VIEW_TYPE_S2V_LOG;
	}

	getDisplayText(): string {
		return "Site2Vault Log";
	}

	getIcon(): string {
		return "download-cloud";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1]!;
		container.empty();
		container.addClass("s2v-log");

		// Header
		this.headerEl = container.createDiv({ cls: "s2v-header" });

		// Controls
		const controls = container.createDiv({ cls: "s2v-controls" });

		const filterLabel = controls.createSpan({ text: "Filter: " });
		this.filterEl = filterLabel.createEl("input", { type: "text" });
		this.filterEl.placeholder = "search...";
		this.filterEl.addEventListener("input", () => {
			this.filterText = this.filterEl.value.toLowerCase();
			this.scheduleRender();
		});

		controls.createSpan({ text: " Level: " });
		this.levelSelectEl = controls.createEl("select");
		for (const [val, label] of [
			["all", "All"],
			["errors", "Errors only"],
			["writes", "Writes only"],
			["no-muted", "No muted"],
		] as const) {
			this.levelSelectEl.createEl("option", { value: val, text: label });
		}
		this.levelSelectEl.addEventListener("change", () => {
			this.levelFilter = this.levelSelectEl.value as LevelFilter;
			this.scheduleRender();
		});

		const autoScrollLabel = controls.createEl("label", { text: " Autoscroll " });
		this.autoScrollEl = autoScrollLabel.createEl("input", { type: "checkbox" });
		this.autoScrollEl.checked = true;
		this.autoScrollEl.addEventListener("change", () => {
			this.autoScroll = this.autoScrollEl.checked;
		});

		// Action bar (cancel / clear buttons — always visible)
		this.actionBar = container.createDiv({ cls: "s2v-controls" });
		const cancelBtn = this.actionBar.createEl("button", { text: "Cancel current job" });
		cancelBtn.addEventListener("click", () => this.onCancel());
		const cancelAllBtn = this.actionBar.createEl("button", { text: "Clear pending queue" });
		cancelAllBtn.addEventListener("click", () => this.onCancelAll());

		// Log container
		this.logContainer = container.createDiv({ cls: "s2v-log-rows" });
		this.logContainer.addEventListener("scroll", () => {
			if (!this.autoScroll) return;
			const el = this.logContainer;
			const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
			if (!atBottom) {
				this.autoScroll = false;
				this.autoScrollEl.checked = false;
			}
		});

		// Footer
		this.footerEl = container.createDiv({ cls: "s2v-footer" });
		this.buildFooter();

		// Subscribe
		this.unsub = this.logStore.subscribe(() => this.scheduleRender());
		this.renderNow();
	}

	async onClose(): Promise<void> {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId);
			this.rafId = null;
		}
	}

	private scheduleRender(): void {
		if (this.dirty) return;
		this.dirty = true;
		this.rafId = requestAnimationFrame(() => {
			this.dirty = false;
			this.rafId = null;
			this.renderNow();
		});
	}

	private renderNow(): void {
		this.renderHeader();
		this.renderRows();
		this.buildFooter();
	}

	private renderHeader(): void {
		const c = this.logStore.getCounters();
		const qs = this.getQueueState();
		const parts: string[] = ["Site2Vault"];

		if (qs.active) {
			if (c.phase) parts.push(c.phase);
			parts.push(`fetched ${c.fetched}`);
			parts.push(`written ${c.written}`);
			parts.push(`failed ${c.failed}`);
			if (c.effectiveRate !== null) {
				parts.push(`rate ${c.effectiveRate.toFixed(1)}/s`);
			}
			const elapsed = Math.floor((Date.now() - c.startedAt) / 1000);
			const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
			const ss = String(elapsed % 60).padStart(2, "0");
			parts.push(`elapsed ${mm}:${ss}`);
			if (qs.pending.length > 0) {
				parts.push(`queue: ${qs.pending.length} pending`);
			}
		} else {
			parts.push("idle");
		}

		this.headerEl.setText(parts.join(" | "));
	}

	private renderRows(): void {
		const entries = this.logStore.getEntries();
		const filtered = entries.filter(e => this.matchEntry(e));

		this.logContainer.empty();
		for (const entry of filtered) {
			const row = this.logContainer.createDiv({
				cls: `s2v-row s2v-${entry.level}`,
			});
			const ts = entry.ts.slice(11, 19); // HH:MM:SS
			row.setText(`${ts}  ${entry.level.padEnd(5)}  ${entry.text}`);
		}

		if (this.autoScroll) {
			this.logContainer.scrollTop = this.logContainer.scrollHeight;
		}
	}

	private matchEntry(entry: LogEntry): boolean {
		// Level filter
		switch (this.levelFilter) {
			case "errors":
				if (entry.level !== "warn" && entry.level !== "error") return false;
				break;
			case "writes":
				if (entry.raw.event !== "note_written") return false;
				break;
			case "no-muted":
				if (entry.level === "muted") return false;
				break;
		}

		// Text filter
		if (this.filterText) {
			const haystack = (entry.text + (entry.url ?? "")).toLowerCase();
			if (!haystack.includes(this.filterText)) return false;
		}

		return true;
	}

	private buildFooter(): void {
		this.footerEl.empty();

		const logPath = this.getLogFilePath();
		if (logPath) {
			const revealBtn = this.footerEl.createEl("button", { text: "Reveal log file" });
			revealBtn.addEventListener("click", () => {
				try {
					// eslint-disable-next-line @typescript-eslint/no-require-imports
					const electron = require("electron") as { shell: { showItemInFolder: (path: string) => void } };
					electron.shell.showItemInFolder(logPath);
				} catch {
					// fallback: do nothing
				}
			});
		}
	}
}
