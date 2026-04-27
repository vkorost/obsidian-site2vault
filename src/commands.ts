/** Command palette registration for Site2Vault. */

import type { App, FileSystemAdapter } from "obsidian";
import { FuzzySuggestModal, Notice } from "obsidian";
import type Site2VaultPlugin from "./main";
import { JobModal } from "./modal";
import { existsSync, readdirSync } from "fs";
import { join } from "path";


export function registerCommands(plugin: Site2VaultPlugin): void {
	plugin.addCommand({
		id: "mirror-site",
		name: "Mirror site to vault",
		callback: () => {
			new JobModal(
				plugin.app,
				plugin.settings,
				"mirror",
				(result) => plugin.enqueueJob(result.request),
			).open();
		},
	});

	plugin.addCommand({
		id: "add-single-page",
		name: "Add single page to vault",
		callback: () => {
			new JobModal(
				plugin.app,
				plugin.settings,
				"single",
				(result) => plugin.enqueueJob(result.request),
			).open();
		},
	});

	plugin.addCommand({
		id: "refresh-site",
		name: "Refresh previously crawled site",
		callback: () => {
			const sites = discoverCrawledSites(plugin.app);
			if (sites.length === 0) {
				new Notice("No previously crawled sites found in this vault.");
				return;
			}
			new SitePicker(plugin.app, sites, () => {
				new JobModal(
					plugin.app,
					plugin.settings,
					"refresh",
					(result) => plugin.enqueueJob(result.request),
				).open();
			}).open();
		},
	});

	plugin.addCommand({
		id: "cancel-job",
		name: "Cancel running Site2Vault job",
		callback: () => plugin.cancelCurrentJob(),
	});

	plugin.addCommand({
		id: "open-log",
		name: "Open Site2Vault log",
		callback: () => plugin.activateLogView(),
	});
}

function discoverCrawledSites(app: App): string[] {
	const adapter = app.vault.adapter as FileSystemAdapter;
	const basePath = adapter.getBasePath();
	const results: string[] = [];

	try {
		const entries = readdirSync(basePath, { withFileTypes: true });
		for (const entry of entries) {
			if (!entry.isDirectory()) continue;
			if (entry.name.startsWith(".")) continue;
			// Check for site2vault marker: log/site2vault.sqlite
			const sqlitePath = join(basePath, entry.name, "log", "site2vault.sqlite");
			if (existsSync(sqlitePath)) {
				results.push(entry.name);
			}
		}
	} catch {
		// non-fatal
	}

	return results;
}

class SitePicker extends FuzzySuggestModal<string> {
	constructor(
		app: App,
		private items: string[],
		private onChoose: (site: string) => void,
	) {
		super(app);
		this.setPlaceholder("Select site to refresh...");
	}

	getItems(): string[] {
		return this.items;
	}

	getItemText(item: string): string {
		return item;
	}

	onChooseItem(item: string): void {
		this.onChoose(item);
	}
}
