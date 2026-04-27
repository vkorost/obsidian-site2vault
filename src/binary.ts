/** Binary resolution: find the site2vault CLI executable. */

import { existsSync } from "fs";
import { join } from "path";
import { access, constants } from "fs/promises";

export class BinaryNotFoundError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "BinaryNotFoundError";
	}
}

export async function resolveBinary(binaryPath: string, autoDetectOnPath: boolean): Promise<string> {
	// 1. Explicit path
	if (binaryPath) {
		try {
			await access(binaryPath, constants.X_OK);
			return binaryPath;
		} catch {
			// On Windows, X_OK check may not work. Fall back to existence check.
			if (existsSync(binaryPath)) {
				return binaryPath;
			}
			throw new BinaryNotFoundError(
				`Configured binary path does not exist or is not executable: ${binaryPath}`,
			);
		}
	}

	// 2. Auto-detect on PATH
	if (autoDetectOnPath) {
		const pathEnv = process.env["PATH"] ?? process.env["Path"] ?? "";
		const dirs = pathEnv.split(process.platform === "win32" ? ";" : ":");
		const names = process.platform === "win32"
			? ["site2vault.exe", "site2vault.cmd", "site2vault"]
			: ["site2vault"];

		for (const dir of dirs) {
			if (!dir) continue;
			for (const name of names) {
				const candidate = join(dir, name);
				if (existsSync(candidate)) {
					return candidate;
				}
			}
		}
	}

	throw new BinaryNotFoundError(
		"site2vault binary not found. Install via `pipx install site2vault` or set the path in plugin settings.",
	);
}
