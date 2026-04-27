/** JSONL line buffer and event parser. Pure module, no I/O. */

import type { ProgressEvent, ParseError } from "./types";

const KNOWN_EVENTS = new Set([
	"run_start", "phase_start", "fetch_start", "fetch_done",
	"fetch_failed", "fetch_unchanged", "note_written",
	"sitemap_discovered", "phase_end", "run_end",
]);

const MAX_LINE_LENGTH = 1_048_576; // 1 MB

export class LineBuffer {
	private buf = "";

	push(chunk: string): string[] {
		this.buf += chunk;
		const lines: string[] = [];
		let idx: number;
		while ((idx = this.buf.indexOf("\n")) !== -1) {
			lines.push(this.buf.slice(0, idx).replace(/\r$/, ""));
			this.buf = this.buf.slice(idx + 1);
		}
		return lines;
	}

	flush(): string[] {
		if (this.buf.length === 0) {
			return [];
		}
		const line = this.buf.replace(/\r$/, "");
		this.buf = "";
		return [line];
	}
}

export function parseEvent(line: string): ProgressEvent | ParseError {
	if (line.length > MAX_LINE_LENGTH) {
		return { kind: "parse_error", line: line.slice(0, 200), message: "Line exceeds 1 MB limit" };
	}

	const trimmed = line.trim();
	if (trimmed.length === 0) {
		return { kind: "parse_error", line, message: "Empty line" };
	}

	let obj: unknown;
	try {
		obj = JSON.parse(trimmed);
	} catch (e) {
		return {
			kind: "parse_error",
			line: trimmed.slice(0, 200),
			message: e instanceof Error ? e.message : "JSON parse error",
		};
	}

	if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
		return { kind: "parse_error", line: trimmed.slice(0, 200), message: "Not a JSON object" };
	}

	const record = obj as Record<string, unknown>;
	const eventName = record["event"];
	const ts = typeof record["ts"] === "string" ? record["ts"] : new Date().toISOString();

	if (typeof eventName === "string" && KNOWN_EVENTS.has(eventName)) {
		return { ...record, event: eventName, ts } as unknown as ProgressEvent;
	}

	return { event: "unknown", ts, raw: record };
}
