/** Pure function: settings + overrides -> argv array for child_process.spawn. */

import type { Site2VaultSettings, JobRequest } from "./types";
import { DEFAULT_SETTINGS } from "./settings";

export function buildArgv(
	settings: Site2VaultSettings,
	request: JobRequest,
): string[] {
	const s = { ...settings, ...request.overrides };
	const argv: string[] = [];

	// Required flags
	argv.push("--url", request.url);
	argv.push("--path", request.outPath);
	argv.push("--name", request.name);

	// Always enable JSON progress for plugin consumption
	argv.push("--json-progress");

	// Mode flags
	if (request.mode === "single") {
		argv.push("--single");
	}
	if (request.mode === "refresh") {
		argv.push("--refresh");
		if (s.defaultPrune) {
			argv.push("--prune");
		}
	}

	// Crawl control
	if (s.defaultDepth !== DEFAULT_SETTINGS.defaultDepth || "defaultDepth" in request.overrides) {
		argv.push("--depth", String(s.defaultDepth));
	}
	if (s.defaultMaxPages !== DEFAULT_SETTINGS.defaultMaxPages || "defaultMaxPages" in request.overrides) {
		argv.push("--max-pages", String(s.defaultMaxPages));
	}
	if (s.defaultTimeoutMinutes !== null) {
		argv.push("--timeout", String(s.defaultTimeoutMinutes));
	}
	if (s.defaultSubdomainPolicy !== DEFAULT_SETTINGS.defaultSubdomainPolicy || "defaultSubdomainPolicy" in request.overrides) {
		argv.push("--subdomain-policy", s.defaultSubdomainPolicy);
	}
	if (!s.defaultSameDomain) {
		argv.push("--no-same-domain");
	}

	// Repeatable flags
	for (const pattern of s.defaultIncludeRegex) {
		if (pattern) argv.push("--include", pattern);
	}
	for (const pattern of s.defaultExcludeRegex) {
		if (pattern) argv.push("--exclude", pattern);
	}
	for (const tag of s.defaultTags) {
		if (tag) argv.push("--tag", tag);
	}

	// Politeness
	if (s.defaultRate !== DEFAULT_SETTINGS.defaultRate || "defaultRate" in request.overrides) {
		argv.push("--rate", String(s.defaultRate));
	}
	if (s.defaultConcurrency !== DEFAULT_SETTINGS.defaultConcurrency || "defaultConcurrency" in request.overrides) {
		argv.push("--concurrency", String(s.defaultConcurrency));
	}
	if (s.defaultJitter !== DEFAULT_SETTINGS.defaultJitter || "defaultJitter" in request.overrides) {
		argv.push("--jitter", String(s.defaultJitter));
	}
	if (s.defaultMinDelay !== DEFAULT_SETTINGS.defaultMinDelay || "defaultMinDelay" in request.overrides) {
		argv.push("--min-delay", String(s.defaultMinDelay));
	}
	if (s.defaultMaxErrors !== DEFAULT_SETTINGS.defaultMaxErrors || "defaultMaxErrors" in request.overrides) {
		argv.push("--max-errors", String(s.defaultMaxErrors));
	}
	if (s.defaultIgnoreRobots) {
		argv.push("--ignore-robots");
	}
	if (s.defaultRenderJs) {
		argv.push("--render-js");
	}
	if (s.defaultUserAgent) {
		argv.push("--user-agent", s.defaultUserAgent);
	}

	// Output
	if (s.defaultFlat) {
		argv.push("--flat");
	}
	if (s.defaultLinkStyle !== DEFAULT_SETTINGS.defaultLinkStyle || "defaultLinkStyle" in request.overrides) {
		argv.push("--link-style", s.defaultLinkStyle);
	}
	if (s.defaultTitleFrom !== DEFAULT_SETTINGS.defaultTitleFrom || "defaultTitleFrom" in request.overrides) {
		argv.push("--title-from", s.defaultTitleFrom);
	}
	if (s.defaultNoManifest) {
		argv.push("--no-manifest");
	}
	if (s.defaultNoSitemap) {
		argv.push("--no-sitemap");
	}
	if (s.defaultNoStaticBoilerplate) {
		argv.push("--no-static-boilerplate");
	}
	if (s.defaultNoCrossPageBoilerplate) {
		argv.push("--no-cross-page-boilerplate");
	}
	if (s.defaultBoilerplateThreshold !== DEFAULT_SETTINGS.defaultBoilerplateThreshold || "defaultBoilerplateThreshold" in request.overrides) {
		argv.push("--boilerplate-threshold", String(s.defaultBoilerplateThreshold));
	}

	// Resume
	if (!s.defaultResume) {
		argv.push("--no-resume");
	}
	if (s.defaultForce) {
		argv.push("--force");
	}

	return argv;
}
