/** Ring buffer log store with counters for the log view and status bar. */

import type { ProgressEvent, LogEntry, LogLevel, JobCounters } from "./types";

const MAX_ENTRIES = 500;
const RATE_WINDOW_MS = 30_000;

function eventToLogEntry(event: ProgressEvent): LogEntry {
	let level: LogLevel;
	let text: string;
	let url: string | undefined;

	switch (event.event) {
		case "run_start":
			level = "info";
			text = `=== run started: ${event.seed_url ?? "unknown"} ===`;
			break;
		case "phase_start":
			level = "info";
			text = `--- phase: ${event.phase} ---`;
			break;
		case "fetch_start":
			level = "muted";
			text = `GET ${event.url}${event.depth != null ? ` (depth ${event.depth})` : ""}`;
			url = event.url;
			break;
		case "fetch_done":
			level = "ok";
			text = `${event.status ?? "???"} ${event.url} (${event.bytes ?? 0} bytes, ${event.duration_ms ?? 0}ms)`;
			url = event.url;
			break;
		case "fetch_unchanged":
			level = "muted";
			text = `304 ${event.url}`;
			url = event.url;
			break;
		case "fetch_failed":
			level = "warn";
			text = `FAIL ${event.url}: ${event.reason ?? "unknown"} (attempt ${event.attempt ?? "?"})`;
			url = event.url;
			break;
		case "note_written":
			level = "ok";
			text = `wrote ${event.file} from ${event.url}`;
			url = event.url;
			break;
		case "sitemap_discovered":
			level = "info";
			text = `sitemap: ${event.url} (${event.url_count ?? "?"} URLs)`;
			url = event.url;
			break;
		case "phase_end":
			level = "info";
			text = `--- phase done: ${event.phase} ---`;
			break;
		case "run_end":
			level = "info";
			text = `=== run end: exit ${event.exit_code ?? "?"} ===`;
			break;
		case "unknown":
			level = "muted";
			text = `unknown event: ${JSON.stringify(event.raw)}`;
			break;
	}

	return { ts: event.ts, level, text, url, raw: event };
}

function makeCounters(): JobCounters {
	return {
		fetched: 0,
		written: 0,
		failed: 0,
		skipped: 0,
		unchanged: 0,
		totalEstimate: null,
		phase: "",
		startedAt: Date.now(),
		effectiveRate: null,
	};
}

export class LogStore {
	private buffer: LogEntry[] = [];
	private counters: JobCounters = makeCounters();
	private listeners = new Set<() => void>();
	private fetchTimes: number[] = [];

	recordEvent(event: ProgressEvent): void {
		const entry = eventToLogEntry(event);

		// Ring buffer
		if (this.buffer.length >= MAX_ENTRIES) {
			this.buffer.shift();
		}
		this.buffer.push(entry);

		// Update counters
		switch (event.event) {
			case "phase_start":
				this.counters.phase = event.phase;
				break;
			case "fetch_done":
				this.counters.fetched++;
				this.fetchTimes.push(Date.now());
				this.updateRate();
				break;
			case "fetch_failed":
				this.counters.failed++;
				break;
			case "fetch_unchanged":
				this.counters.unchanged++;
				break;
			case "note_written":
				this.counters.written++;
				break;
		}

		this.notify();
	}

	getEntries(): readonly LogEntry[] {
		return this.buffer;
	}

	getCounters(): JobCounters {
		return { ...this.counters };
	}

	subscribe(fn: () => void): () => void {
		this.listeners.add(fn);
		return () => { this.listeners.delete(fn); };
	}

	reset(): void {
		this.buffer = [];
		this.counters = makeCounters();
		this.fetchTimes = [];
		this.notify();
	}

	private updateRate(): void {
		const now = Date.now();
		const cutoff = now - RATE_WINDOW_MS;
		this.fetchTimes = this.fetchTimes.filter(t => t > cutoff);
		if (this.fetchTimes.length >= 2) {
			const windowMs = now - this.fetchTimes[0]!;
			this.counters.effectiveRate = windowMs > 0
				? (this.fetchTimes.length / (windowMs / 1000))
				: null;
		} else {
			this.counters.effectiveRate = null;
		}
	}

	private notify(): void {
		for (const fn of this.listeners) {
			fn();
		}
	}
}
