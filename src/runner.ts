/** JobRunner: one job lifecycle — spawns child process, wires stdout/stderr. */

import { spawn, execSync } from "child_process";
import type { ChildProcess } from "child_process";
import { LineBuffer, parseEvent } from "./jsonl";
import type { ProgressEvent } from "./types";

const KILL_TIMEOUT_MS = 5000;
const MAX_STDERR_BYTES = 65_536;

export interface RunnerCallbacks {
	onEvent: (event: ProgressEvent) => void;
	onStderr: (chunk: string) => void;
	onExit: (code: number, signal: string | null) => void;
}

export class JobRunner {
	private child: ChildProcess | null = null;
	private killed = false;
	private killTimer: ReturnType<typeof setTimeout> | null = null;
	private stderrBuf = "";

	constructor(
		private binary: string,
		private argv: string[],
		private callbacks: RunnerCallbacks,
	) {}

	start(): void {
		try {
			this.child = spawn(this.binary, this.argv, {
				stdio: ["ignore", "pipe", "pipe"],
				windowsHide: true,
			});
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			this.callbacks.onStderr(`Failed to spawn: ${msg}`);
			this.callbacks.onExit(1, null);
			return;
		}

		const lineBuf = new LineBuffer();

		this.child.stdout?.on("data", (chunk: Buffer) => {
			const lines = lineBuf.push(chunk.toString("utf-8"));
			for (const line of lines) {
				if (!line.trim()) continue;
				const result = parseEvent(line);
				if ("kind" in result) {
					// ParseError — skip, optionally log
					this.callbacks.onStderr(`JSONL parse error: ${result.message}`);
				} else {
					this.callbacks.onEvent(result);
				}
			}
		});

		this.child.stderr?.on("data", (chunk: Buffer) => {
			const text = chunk.toString("utf-8");
			// Keep last MAX_STDERR_BYTES only
			this.stderrBuf += text;
			if (this.stderrBuf.length > MAX_STDERR_BYTES) {
				this.stderrBuf = this.stderrBuf.slice(-MAX_STDERR_BYTES);
			}
			this.callbacks.onStderr(text);
		});

		this.child.on("error", (err: Error) => {
			this.callbacks.onStderr(`Process error: ${err.message}`);
			this.callbacks.onExit(1, null);
		});

		this.child.on("exit", (code: number | null, signal: string | null) => {
			// Flush remaining stdout
			const remaining = lineBuf.flush();
			for (const line of remaining) {
				if (!line.trim()) continue;
				const result = parseEvent(line);
				if (!("kind" in result)) {
					this.callbacks.onEvent(result);
				}
			}

			if (this.killTimer) {
				clearTimeout(this.killTimer);
				this.killTimer = null;
			}
			this.callbacks.onExit(code ?? 1, signal);
		});
	}

	cancel(): void {
		if (!this.child || this.killed) return;
		this.killed = true;

		if (process.platform === "win32") {
			// taskkill /T kills the entire process tree on Windows
			this.killProcessTree();
		} else {
			this.child.kill("SIGTERM");
			// Force kill after timeout
			this.killTimer = setTimeout(() => {
				if (this.child && !this.child.killed) {
					this.child.kill("SIGKILL");
				}
			}, KILL_TIMEOUT_MS);
		}
	}

	private killProcessTree(): void {
		const pid = this.child?.pid;
		if (!pid) return;
		try {
			execSync(`taskkill /pid ${pid} /T /F`, {
				windowsHide: true,
				stdio: "ignore",
			});
		} catch {
			// Fallback if taskkill fails (process may have already exited)
			this.child?.kill();
		}
	}

	/** Synchronous kill for use during window close — must not be async. */
	killSync(): void {
		const pid = this.child?.pid;
		if (!pid) return;
		try {
			if (process.platform === "win32") {
				execSync(`taskkill /pid ${pid} /T /F`, {
					windowsHide: true,
					stdio: "ignore",
				});
			} else {
				process.kill(pid, "SIGKILL");
			}
		} catch {
			// Process may have already exited
		}
	}

	getStderrTail(): string {
		return this.stderrBuf;
	}
}
