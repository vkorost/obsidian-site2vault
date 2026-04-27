/** Exit code -> Outcome mapping. Pure function, no I/O. */

import type { Outcome } from "./types";

export function describeExit(
	code: number,
	signal: string | null,
	stderrTail: string,
): Outcome {
	// Signal override: if killed by signal, treat as user abort
	if (signal === "SIGTERM" || signal === "SIGKILL") {
		return { kind: "userAbort" };
	}

	switch (code) {
		case 0:
			return { kind: "success", openIndex: true };
		case 2:
			return { kind: "partial" };
		case 3:
			return { kind: "userAbort" };
		case 4:
			return { kind: "resumeConflict" };
		default: {
			const firstLine = stderrTail.split("\n").find(l => l.trim().length > 0) ?? "Unknown error";
			return { kind: "fatal", firstStderrLine: firstLine.trim() };
		}
	}
}
