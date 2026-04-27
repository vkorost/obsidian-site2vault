/** On-disk JSONL mirror of progress events. */

import type { FileSystemAdapter } from "obsidian";
import type { ProgressEvent } from "./types";
import { createWriteStream, mkdirSync } from "fs";
import type { WriteStream } from "fs";
import { dirname, join } from "path";

export class LogFileMirror {
	private stream: WriteStream | null = null;
	private filePath: string | null = null;

	open(adapter: FileSystemAdapter, logDir: string, label: string): void {
		const basePath = adapter.getBasePath();
		const now = new Date();
		const ts = now.toISOString().replace(/[:.]/g, "-").slice(0, 19);
		const filename = `${ts}-${label || "default"}.jsonl`;
		const dir = join(basePath, logDir);

		try {
			mkdirSync(dir, { recursive: true });
		} catch {
			// non-fatal
			console.warn("[Site2Vault] Failed to create log directory:", dir);
			return;
		}

		this.filePath = join(dir, filename);
		try {
			this.stream = createWriteStream(this.filePath, { flags: "a", encoding: "utf-8" });
		} catch {
			console.warn("[Site2Vault] Failed to open log file:", this.filePath);
			this.stream = null;
			this.filePath = null;
		}
	}

	write(event: ProgressEvent): void {
		if (!this.stream) return;
		try {
			this.stream.write(JSON.stringify(event) + "\n");
		} catch {
			// non-fatal
		}
	}

	close(): void {
		if (this.stream) {
			this.stream.end();
			this.stream = null;
		}
	}

	getFilePath(): string | null {
		return this.filePath;
	}
}
