/** Shared types for the Site2Vault Obsidian plugin. */

export interface Site2VaultSettings {
	// Binary
	binaryPath: string;
	autoDetectOnPath: boolean;

	// Output defaults
	defaultPath: string;
	defaultNameTemplate: string;
	// Crawl control
	defaultDepth: number;
	defaultMaxPages: number;
	defaultTimeoutMinutes: number | null;
	defaultIncludeRegex: string[];
	defaultExcludeRegex: string[];
	defaultSubdomainPolicy: "strict" | "include" | "any";
	defaultSameDomain: boolean;

	// Politeness
	defaultRate: number;
	defaultConcurrency: number;
	defaultJitter: number;
	defaultMinDelay: number;
	defaultMaxErrors: number;
	defaultIgnoreRobots: boolean;
	defaultRenderJs: boolean;
	defaultUserAgent: string;

	// Output
	defaultFlat: boolean;
	defaultLinkStyle: "shortest" | "path";
	defaultTags: string[];
	defaultTitleFrom: "auto" | "h1" | "url";
	defaultNoManifest: boolean;
	defaultNoSitemap: boolean;
	defaultNoStaticBoilerplate: boolean;
	defaultNoCrossPageBoilerplate: boolean;
	defaultBoilerplateThreshold: number;

	// Resume
	defaultResume: boolean;
	defaultForce: boolean;
	defaultPrune: boolean;

	// Plugin behavior
	schemaVersion: number;
	jobQueueMaxSize: number;
	showStatusBar: boolean;
	openLogViewOnStart: boolean;
	killChildOnObsidianQuit: boolean;
	onDiskLogMirror: boolean;
	onDiskLogDir: string;
	verboseStderrCapture: boolean;
	showResolvedCommandInModal: boolean;
}

export type JobMode = "mirror" | "single" | "refresh";

export interface JobRequest {
	url: string;
	outPath: string;
	name: string;
	mode: JobMode;
	overrides: Partial<Site2VaultSettings>;
}

export type JobStatus = "pending" | "running" | "done" | "failed" | "cancelled";

export interface JobState {
	request: JobRequest;
	status: JobStatus;
	startedAt: number;
}

export interface QueueState {
	active: JobState | null;
	pending: JobRequest[];
}

// ── Progress events (from site2vault CLI --json-progress) ──

interface BaseEvent {
	ts: string;
}

export interface RunStartEvent extends BaseEvent {
	event: "run_start";
	seed_url?: string | undefined;
	config?: Record<string, unknown> | undefined;
}

export interface PhaseStartEvent extends BaseEvent {
	event: "phase_start";
	phase: string;
}

export interface FetchStartEvent extends BaseEvent {
	event: "fetch_start";
	url: string;
	depth?: number | undefined;
}

export interface FetchDoneEvent extends BaseEvent {
	event: "fetch_done";
	url: string;
	status?: number | undefined;
	bytes?: number | undefined;
	duration_ms?: number | undefined;
}

export interface FetchFailedEvent extends BaseEvent {
	event: "fetch_failed";
	url: string;
	reason?: string | undefined;
	attempt?: number | undefined;
}

export interface FetchUnchangedEvent extends BaseEvent {
	event: "fetch_unchanged";
	url: string;
	via?: string | undefined;
}

export interface NoteWrittenEvent extends BaseEvent {
	event: "note_written";
	url: string;
	file: string;
}

export interface SitemapDiscoveredEvent extends BaseEvent {
	event: "sitemap_discovered";
	url: string;
	url_count?: number | undefined;
}

export interface PhaseEndEvent extends BaseEvent {
	event: "phase_end";
	phase: string;
	stats?: Record<string, unknown> | undefined;
}

export interface RunEndEvent extends BaseEvent {
	event: "run_end";
	exit_code?: number | undefined;
	stats?: Record<string, unknown> | undefined;
}

export interface UnknownEvent extends BaseEvent {
	event: "unknown";
	raw: unknown;
}

export type ProgressEvent =
	| RunStartEvent
	| PhaseStartEvent
	| FetchStartEvent
	| FetchDoneEvent
	| FetchFailedEvent
	| FetchUnchangedEvent
	| NoteWrittenEvent
	| SitemapDiscoveredEvent
	| PhaseEndEvent
	| RunEndEvent
	| UnknownEvent;

export type LogLevel = "info" | "ok" | "warn" | "error" | "muted";

export interface LogEntry {
	ts: string;
	level: LogLevel;
	text: string;
	url?: string | undefined;
	raw: ProgressEvent;
}

export interface JobCounters {
	fetched: number;
	written: number;
	failed: number;
	skipped: number;
	unchanged: number;
	totalEstimate: number | null;
	phase: string;
	startedAt: number;
	effectiveRate: number | null;
}

export interface ParseError {
	kind: "parse_error";
	line: string;
	message: string;
}

export type Outcome =
	| { kind: "success"; openIndex: boolean }
	| { kind: "partial" }
	| { kind: "userAbort" }
	| { kind: "fatal"; firstStderrLine: string }
	| { kind: "resumeConflict" };
