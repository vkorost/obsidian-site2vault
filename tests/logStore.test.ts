import { describe, it, expect, vi } from "vitest";
import { LogStore } from "../src/logStore";
import type { ProgressEvent } from "../src/types";

function makeEvent(event: string, extra: Record<string, unknown> = {}): ProgressEvent {
	return { event, ts: "2026-01-01T00:00:00Z", ...extra } as unknown as ProgressEvent;
}

describe("LogStore", () => {
	it("records events and returns them", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("run_start", { seed_url: "https://x.com" }));
		expect(store.getEntries()).toHaveLength(1);
		expect(store.getEntries()[0]!.text).toContain("run started");
	});

	it("ring buffer evicts oldest beyond 500", () => {
		const store = new LogStore();
		for (let i = 0; i < 550; i++) {
			store.recordEvent(makeEvent("fetch_done", { url: `https://x.com/${i}`, status: 200, bytes: 100, duration_ms: 10 }));
		}
		expect(store.getEntries()).toHaveLength(500);
		// First entry should be #50 (0-49 evicted)
		expect(store.getEntries()[0]!.text).toContain("/50");
	});

	it("counts fetched events", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_done", { url: "https://a.com", status: 200, bytes: 100, duration_ms: 10 }));
		store.recordEvent(makeEvent("fetch_done", { url: "https://b.com", status: 200, bytes: 200, duration_ms: 20 }));
		expect(store.getCounters().fetched).toBe(2);
	});

	it("counts written events", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("note_written", { url: "https://a.com", file: "A.md" }));
		expect(store.getCounters().written).toBe(1);
	});

	it("counts failed events", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_failed", { url: "https://a.com", reason: "timeout", attempt: 1 }));
		expect(store.getCounters().failed).toBe(1);
	});

	it("counts unchanged events", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_unchanged", { url: "https://a.com" }));
		expect(store.getCounters().unchanged).toBe(1);
	});

	it("tracks current phase", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("phase_start", { phase: "crawl" }));
		expect(store.getCounters().phase).toBe("crawl");
		store.recordEvent(makeEvent("phase_start", { phase: "rewrite" }));
		expect(store.getCounters().phase).toBe("rewrite");
	});

	it("subscribe notifies on new events", () => {
		const store = new LogStore();
		const fn = vi.fn();
		store.subscribe(fn);
		store.recordEvent(makeEvent("run_start", { seed_url: "https://x.com" }));
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it("unsubscribe stops notifications", () => {
		const store = new LogStore();
		const fn = vi.fn();
		const unsub = store.subscribe(fn);
		unsub();
		store.recordEvent(makeEvent("run_start", { seed_url: "https://x.com" }));
		expect(fn).not.toHaveBeenCalled();
	});

	it("reset clears buffer and counters", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_done", { url: "https://a.com", status: 200, bytes: 100, duration_ms: 10 }));
		store.recordEvent(makeEvent("note_written", { url: "https://a.com", file: "A.md" }));
		store.reset();
		expect(store.getEntries()).toHaveLength(0);
		expect(store.getCounters().fetched).toBe(0);
		expect(store.getCounters().written).toBe(0);
	});

	it("maps run_start to info level", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("run_start", { seed_url: "https://x.com" }));
		expect(store.getEntries()[0]!.level).toBe("info");
	});

	it("maps fetch_done to ok level", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_done", { url: "https://a.com", status: 200, bytes: 50, duration_ms: 10 }));
		expect(store.getEntries()[0]!.level).toBe("ok");
	});

	it("maps fetch_failed to warn level", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_failed", { url: "https://a.com", reason: "500", attempt: 1 }));
		expect(store.getEntries()[0]!.level).toBe("warn");
	});

	it("maps fetch_start to muted level", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_start", { url: "https://a.com", depth: 2 }));
		expect(store.getEntries()[0]!.level).toBe("muted");
	});

	it("maps unknown event to muted level", () => {
		const store = new LogStore();
		store.recordEvent({ event: "unknown", ts: "T", raw: { event: "custom" } });
		expect(store.getEntries()[0]!.level).toBe("muted");
	});

	it("effective rate is null with fewer than 2 fetches", () => {
		const store = new LogStore();
		store.recordEvent(makeEvent("fetch_done", { url: "https://a.com", status: 200, bytes: 100, duration_ms: 10 }));
		expect(store.getCounters().effectiveRate).toBeNull();
	});

	it("getCounters returns a copy", () => {
		const store = new LogStore();
		const c1 = store.getCounters();
		store.recordEvent(makeEvent("fetch_done", { url: "https://a.com", status: 200, bytes: 100, duration_ms: 10 }));
		const c2 = store.getCounters();
		expect(c1.fetched).toBe(0);
		expect(c2.fetched).toBe(1);
	});
});
