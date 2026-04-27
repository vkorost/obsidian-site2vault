import type { Site2VaultSettings } from "./types";

export const DEFAULT_SETTINGS: Site2VaultSettings = {
	// Binary
	binaryPath: "",
	autoDetectOnPath: true,

	// Output defaults
	defaultPath: "",
	defaultNameTemplate: "{hostname}",
	// Crawl control
	defaultDepth: 3,
	defaultMaxPages: 2000,
	defaultTimeoutMinutes: null,
	defaultIncludeRegex: [],
	defaultExcludeRegex: [],
	defaultSubdomainPolicy: "include",
	defaultSameDomain: true,

	// Politeness
	defaultRate: 1.0,
	defaultConcurrency: 2,
	defaultJitter: 0.3,
	defaultMinDelay: 0.5,
	defaultMaxErrors: 10,
	defaultIgnoreRobots: false,
	defaultRenderJs: false,
	defaultUserAgent: "",

	// Output
	defaultFlat: false,
	defaultLinkStyle: "shortest",
	defaultTags: [],
	defaultTitleFrom: "auto",
	defaultNoManifest: false,
	defaultNoSitemap: false,
	defaultNoStaticBoilerplate: false,
	defaultNoCrossPageBoilerplate: false,
	defaultBoilerplateThreshold: 0.5,

	// Resume
	defaultResume: true,
	defaultForce: false,
	defaultPrune: false,

	// Plugin behavior
	schemaVersion: 1,
	jobQueueMaxSize: 10,
	showStatusBar: true,
	openLogViewOnStart: false,
	killChildOnObsidianQuit: true,
	onDiskLogMirror: true,
	onDiskLogDir: ".site2vault-plugin/runs",
	verboseStderrCapture: false,
	showResolvedCommandInModal: true,
};

export function migrateSettings(data: Record<string, unknown>): Record<string, unknown> {
	// v1: no migration needed. Structured for future schema bumps.
	return data;
}
