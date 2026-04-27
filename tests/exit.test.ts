import { describe, it, expect } from "vitest";
import { describeExit } from "../src/exit";

describe("describeExit", () => {
	it("code 0 -> success with openIndex", () => {
		const r = describeExit(0, null, "");
		expect(r).toEqual({ kind: "success", openIndex: true });
	});

	it("code 2 -> partial", () => {
		const r = describeExit(2, null, "");
		expect(r).toEqual({ kind: "partial" });
	});

	it("code 3 -> userAbort", () => {
		const r = describeExit(3, null, "");
		expect(r).toEqual({ kind: "userAbort" });
	});

	it("code 4 -> resumeConflict", () => {
		const r = describeExit(4, null, "");
		expect(r).toEqual({ kind: "resumeConflict" });
	});

	it("code 1 -> fatal with stderr first line", () => {
		const r = describeExit(1, null, "Error: binary not found\nDetails...");
		expect(r.kind).toBe("fatal");
		if (r.kind === "fatal") {
			expect(r.firstStderrLine).toBe("Error: binary not found");
		}
	});

	it("code 1 with empty stderr -> Unknown error", () => {
		const r = describeExit(1, null, "");
		expect(r.kind).toBe("fatal");
		if (r.kind === "fatal") {
			expect(r.firstStderrLine).toBe("Unknown error");
		}
	});

	it("unknown code -> fatal", () => {
		const r = describeExit(127, null, "command not found");
		expect(r.kind).toBe("fatal");
		if (r.kind === "fatal") {
			expect(r.firstStderrLine).toBe("command not found");
		}
	});

	it("SIGTERM signal overrides any code to userAbort", () => {
		const r = describeExit(0, "SIGTERM", "");
		expect(r).toEqual({ kind: "userAbort" });
	});

	it("SIGKILL signal overrides any code to userAbort", () => {
		const r = describeExit(1, "SIGKILL", "some error");
		expect(r).toEqual({ kind: "userAbort" });
	});

	it("non-SIGTERM signal does not override", () => {
		const r = describeExit(1, "SIGINT", "error msg");
		expect(r.kind).toBe("fatal");
	});

	it("fatal with blank lines in stderr picks first non-blank", () => {
		const r = describeExit(1, null, "\n\n  actual error\nmore");
		expect(r.kind).toBe("fatal");
		if (r.kind === "fatal") {
			expect(r.firstStderrLine).toBe("actual error");
		}
	});
});
