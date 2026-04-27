/** Job queue: FIFO, one runner at a time. */

import type { FileSystemAdapter } from "obsidian";
import type { Site2VaultSettings, JobRequest, JobState, QueueState, ProgressEvent } from "./types";
import { buildArgv } from "./argv";
import { resolveBinary } from "./binary";
import { JobRunner } from "./runner";
import { LogStore } from "./logStore";
import { LogFileMirror } from "./logFile";
import { describeExit } from "./exit";
import { noticeInfo, noticeWarn, noticeError } from "./notices";

export interface QueueCallbacks {
	openLogView: () => void;
	openNote: (path: string) => void;
	getAdapter: () => FileSystemAdapter;
	nudgeVault: (folder: string) => void;
}

export class JobQueue {
	private pending: JobRequest[] = [];
	private active: JobState | null = null;
	private runner: JobRunner | null = null;
	private logMirror: LogFileMirror | null = null;

	constructor(
		private settings: Site2VaultSettings,
		private logStore: LogStore,
		private callbacks: QueueCallbacks,
	) {}

	updateSettings(settings: Site2VaultSettings): void {
		this.settings = settings;
	}

	enqueue(request: JobRequest): boolean {
		const maxSize = this.settings.jobQueueMaxSize;
		if (maxSize > 0 && this.pending.length >= maxSize) {
			noticeWarn(`Site2Vault queue is full (max ${maxSize}). Wait for a job to finish.`);
			return false;
		}
		this.pending.push(request);
		if (!this.active) {
			this.runNext();
		}
		return true;
	}

	cancelCurrent(): void {
		if (this.runner) {
			this.runner.cancel();
		}
	}

	cancelAll(): void {
		this.pending = [];
		this.cancelCurrent();
	}

	/** Synchronous kill for window close — guaranteed to run before exit. */
	killAllSync(): void {
		this.pending = [];
		this.runner?.killSync();
	}

	getState(): QueueState {
		return {
			active: this.active,
			pending: [...this.pending],
		};
	}

	private async runNext(): Promise<void> {
		const request = this.pending.shift();
		if (!request) {
			this.active = null;
			return;
		}

		this.logStore.reset();

		let binary: string;
		try {
			binary = await resolveBinary(this.settings.binaryPath, this.settings.autoDetectOnPath);
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			noticeError(msg, { text: "Open settings", onClick: () => this.callbacks.openLogView() });
			this.runNext();
			return;
		}

		const argv = buildArgv(this.settings, request);

		this.active = {
			request,
			status: "running",
			startedAt: Date.now(),
		};

		// Set up on-disk log mirror
		if (this.settings.onDiskLogMirror) {
			this.logMirror = new LogFileMirror();
			this.logMirror.open(
				this.callbacks.getAdapter(),
				this.settings.onDiskLogDir,
				request.name || "default",
			);
		}

		this.runner = new JobRunner(binary, argv, {
			onEvent: (event: ProgressEvent) => {
				this.logStore.recordEvent(event);
				this.logMirror?.write(event);
			},
			onStderr: (chunk: string) => {
				if (this.settings.verboseStderrCapture) {
					// Could route to log store as a special entry
					console.debug("[Site2Vault stderr]", chunk);
				}
			},
			onExit: (code: number, signal: string | null) => {
				const stderrTail = this.runner?.getStderrTail() ?? "";
				const outcome = describeExit(code, signal, stderrTail);

				this.logMirror?.close();
				this.logMirror = null;

				switch (outcome.kind) {
					case "success":
						noticeInfo(`Crawl complete: ${this.logStore.getCounters().written} notes written.`);
						// Nudge vault to pick up new files
						this.callbacks.nudgeVault(request.name);
						break;
					case "partial":
						noticeWarn("Crawl finished with partial success. Check the log for details.");
						break;
					case "userAbort":
						// Silent per spec
						break;
					case "fatal":
						noticeError(`Crawl failed: ${outcome.firstStderrLine}`, {
							text: "Open log",
							onClick: () => this.callbacks.openLogView(),
						});
						break;
					case "resumeConflict":
						noticeError("Cannot resume: existing state has different config. Re-run with Force enabled to override.", {
							text: "Open log",
							onClick: () => this.callbacks.openLogView(),
						});
						break;
				}

				if (this.active) {
					this.active.status = outcome.kind === "success" ? "done"
						: outcome.kind === "userAbort" ? "cancelled"
						: "failed";
				}
				this.active = null;
				this.runner = null;
				this.runNext();
			},
		});

		this.runner.start();
	}
}
