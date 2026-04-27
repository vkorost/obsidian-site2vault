import { describe, it, expect } from "vitest";
import { DEFAULT_SETTINGS, migrateSettings } from "../src/settings";
import type { Site2VaultSettings } from "../src/types";

describe("DEFAULT_SETTINGS", () => {
	it("has all required keys", () => {
		const keys: (keyof Site2VaultSettings)[] = [
			"binaryPath", "autoDetectOnPath",
			"defaultPath", "defaultNameTemplate",
			"defaultDepth", "defaultMaxPages", "defaultTimeoutMinutes",
			"defaultIncludeRegex", "defaultExcludeRegex",
			"defaultSubdomainPolicy", "defaultSameDomain",
			"defaultRate", "defaultConcurrency", "defaultJitter",
			"defaultMinDelay", "defaultMaxErrors",
			"defaultIgnoreRobots", "defaultRenderJs", "defaultUserAgent",
			"defaultFlat", "defaultLinkStyle", "defaultTags", "defaultTitleFrom",
			"defaultNoManifest", "defaultNoSitemap",
			"defaultNoStaticBoilerplate", "defaultNoCrossPageBoilerplate",
			"defaultBoilerplateThreshold",
			"defaultResume", "defaultForce", "defaultPrune",
			"schemaVersion", "jobQueueMaxSize", "showStatusBar",
			"openLogViewOnStart", "killChildOnObsidianQuit",
			"onDiskLogMirror", "onDiskLogDir",
			"verboseStderrCapture", "showResolvedCommandInModal",
		];
		for (const key of keys) {
			expect(DEFAULT_SETTINGS).toHaveProperty(key);
		}
	});

	it("has correct CLI-matching defaults", () => {
		expect(DEFAULT_SETTINGS.defaultDepth).toBe(3);
		expect(DEFAULT_SETTINGS.defaultMaxPages).toBe(2000);
		expect(DEFAULT_SETTINGS.defaultRate).toBe(1.0);
		expect(DEFAULT_SETTINGS.defaultConcurrency).toBe(2);
		expect(DEFAULT_SETTINGS.defaultJitter).toBe(0.3);
		expect(DEFAULT_SETTINGS.defaultBoilerplateThreshold).toBe(0.5);
		expect(DEFAULT_SETTINGS.defaultLinkStyle).toBe("shortest");
		expect(DEFAULT_SETTINGS.defaultTitleFrom).toBe("auto");
		expect(DEFAULT_SETTINGS.defaultResume).toBe(true);
		expect(DEFAULT_SETTINGS.defaultForce).toBe(false);
	});

	it("has schemaVersion 1", () => {
		expect(DEFAULT_SETTINGS.schemaVersion).toBe(1);
	});

	it("has killChildOnObsidianQuit locked to true", () => {
		expect(DEFAULT_SETTINGS.killChildOnObsidianQuit).toBe(true);
	});
});

describe("migrateSettings", () => {
	it("returns data unchanged for v1", () => {
		const data = { schemaVersion: 1, binaryPath: "/usr/bin/site2vault" };
		expect(migrateSettings(data)).toEqual(data);
	});

	it("returns empty object unchanged", () => {
		expect(migrateSettings({})).toEqual({});
	});
});
