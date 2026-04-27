import { describe, it, expect } from "vitest";
import { LineBuffer, parseEvent } from "../src/jsonl";

describe("LineBuffer", () => {
	it("splits complete lines", () => {
		const buf = new LineBuffer();
		const lines = buf.push("hello\nworld\n");
		expect(lines).toEqual(["hello", "world"]);
	});

	it("holds partial trailing data", () => {
		const buf = new LineBuffer();
		expect(buf.push("hello")).toEqual([]);
		expect(buf.push(" world\n")).toEqual(["hello world"]);
	});

	it("handles split across chunks", () => {
		const buf = new LineBuffer();
		expect(buf.push('{"event":"r')).toEqual([]);
		expect(buf.push('un_start"}\n')).toEqual(['{"event":"run_start"}']);
	});

	it("flush returns final partial", () => {
		const buf = new LineBuffer();
		buf.push("trailing");
		expect(buf.flush()).toEqual(["trailing"]);
	});

	it("flush returns empty array when empty", () => {
		const buf = new LineBuffer();
		expect(buf.flush()).toEqual([]);
	});

	it("handles CRLF line endings", () => {
		const buf = new LineBuffer();
		const lines = buf.push("line1\r\nline2\r\n");
		expect(lines).toEqual(["line1", "line2"]);
	});

	it("handles blank lines", () => {
		const buf = new LineBuffer();
		const lines = buf.push("a\n\nb\n");
		expect(lines).toEqual(["a", "", "b"]);
	});

	it("handles multiple consecutive pushes", () => {
		const buf = new LineBuffer();
		expect(buf.push("a\n")).toEqual(["a"]);
		expect(buf.push("b\n")).toEqual(["b"]);
		expect(buf.push("c")).toEqual([]);
		expect(buf.push("d\ne\n")).toEqual(["cd", "e"]);
	});
});

describe("parseEvent", () => {
	it("parses run_start event", () => {
		const result = parseEvent('{"event":"run_start","ts":"2026-01-01T00:00:00Z","seed_url":"https://example.com"}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("run_start");
			expect(result.ts).toBe("2026-01-01T00:00:00Z");
		}
	});

	it("parses phase_start event", () => {
		const result = parseEvent('{"event":"phase_start","ts":"T","phase":"crawl"}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("phase_start");
		}
	});

	it("parses fetch_done event", () => {
		const result = parseEvent('{"event":"fetch_done","ts":"T","url":"https://x.com","status":200,"bytes":1024,"duration_ms":50}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("fetch_done");
		}
	});

	it("parses fetch_failed event", () => {
		const result = parseEvent('{"event":"fetch_failed","ts":"T","url":"https://x.com","reason":"timeout","attempt":2}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("fetch_failed");
		}
	});

	it("parses fetch_unchanged event", () => {
		const result = parseEvent('{"event":"fetch_unchanged","ts":"T","url":"https://x.com"}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("fetch_unchanged");
		}
	});

	it("parses note_written event", () => {
		const result = parseEvent('{"event":"note_written","ts":"T","url":"https://x.com","file":"Index.md"}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("note_written");
		}
	});

	it("parses sitemap_discovered event", () => {
		const result = parseEvent('{"event":"sitemap_discovered","ts":"T","url":"https://x.com/sitemap.xml","url_count":50}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("sitemap_discovered");
		}
	});

	it("parses phase_end event", () => {
		const result = parseEvent('{"event":"phase_end","ts":"T","phase":"crawl","stats":{"pages":10}}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("phase_end");
		}
	});

	it("parses run_end event", () => {
		const result = parseEvent('{"event":"run_end","ts":"T","exit_code":0}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("run_end");
		}
	});

	it("wraps unknown event name as unknown type", () => {
		const result = parseEvent('{"event":"custom_thing","ts":"T","data":123}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.event).toBe("unknown");
			if (result.event === "unknown") {
				expect(result.raw).toHaveProperty("event", "custom_thing");
			}
		}
	});

	it("returns ParseError for malformed JSON", () => {
		const result = parseEvent("{not json}");
		expect(result).toHaveProperty("kind", "parse_error");
	});

	it("returns ParseError for empty line", () => {
		const result = parseEvent("");
		expect(result).toHaveProperty("kind", "parse_error");
	});

	it("returns ParseError for whitespace-only line", () => {
		const result = parseEvent("   ");
		expect(result).toHaveProperty("kind", "parse_error");
	});

	it("returns ParseError for JSON array", () => {
		const result = parseEvent("[1,2,3]");
		expect(result).toHaveProperty("kind", "parse_error");
	});

	it("returns ParseError for JSON string", () => {
		const result = parseEvent('"hello"');
		expect(result).toHaveProperty("kind", "parse_error");
	});

	it("returns ParseError for line exceeding 1 MB", () => {
		const huge = '{"event":"run_start","ts":"T","data":"' + "x".repeat(1_100_000) + '"}';
		const result = parseEvent(huge);
		expect(result).toHaveProperty("kind", "parse_error");
		if ("kind" in result) {
			expect(result.message).toContain("1 MB");
		}
	});

	it("handles Unicode payloads", () => {
		const result = parseEvent('{"event":"note_written","ts":"T","url":"https://x.com","file":"日本語ノート.md"}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result) && result.event === "note_written") {
			expect(result.file).toBe("日本語ノート.md");
		}
	});

	it("synthesizes ts when missing from event", () => {
		const result = parseEvent('{"event":"run_start"}');
		expect(result).not.toHaveProperty("kind");
		if (!("kind" in result)) {
			expect(result.ts).toBeTruthy();
		}
	});
});
