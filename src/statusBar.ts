/** Status bar item showing crawl state. */

import type { Plugin } from "obsidian";
import type { LogStore } from "./logStore";
import type { QueueState } from "./types";

export class StatusBar {
	private el: HTMLElement | null = null;
	private unsub: (() => void) | null = null;

	constructor(
		private plugin: Plugin,
		private logStore: LogStore,
		private getQueueState: () => QueueState,
		private onActivate: () => void,
	) {}

	enable(): void {
		this.el = this.plugin.addStatusBarItem();
		this.el.addClass("s2v-status");
		this.el.addEventListener("click", () => this.onActivate());
		this.unsub = this.logStore.subscribe(() => this.render());
		this.render();
	}

	disable(): void {
		if (this.unsub) {
			this.unsub();
			this.unsub = null;
		}
		if (this.el) {
			this.el.remove();
			this.el = null;
		}
	}

	render(): void {
		if (!this.el) return;

		const qs = this.getQueueState();
		if (!qs.active) {
			this.el.setText("Site2Vault: idle");
			return;
		}

		const c = this.logStore.getCounters();
		const parts: string[] = ["Site2Vault"];
		if (c.phase) parts.push(c.phase);
		parts.push(`${c.fetched}/${c.totalEstimate ?? "?"}`);
		parts.push(`err ${c.failed}`);

		if (qs.pending.length > 0) {
			parts.push(`+${qs.pending.length} queued`);
		}

		this.el.setText(parts.join(" | "));
	}
}
