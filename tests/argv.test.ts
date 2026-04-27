import { describe, it, expect } from "vitest";
import { buildArgv } from "../src/argv";
import { DEFAULT_SETTINGS } from "../src/settings";
import type { Site2VaultSettings, JobRequest } from "../src/types";

function makeRequest(overrides: Partial<JobRequest> = {}): JobRequest {
	return {
		url: "https://docs.example.com",
		outPath: "/vault",
		name: "docs",
		mode: "mirror",
		overrides: {},
		...overrides,
	};
}

function makeSettings(overrides: Partial<Site2VaultSettings> = {}): Site2VaultSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

describe("buildArgv", () => {
	it("produces minimal mirror argv", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest());
		expect(argv).toContain("--url");
		expect(argv).toContain("https://docs.example.com");
		expect(argv).toContain("--path");
		expect(argv).toContain("/vault");
		expect(argv).toContain("--name");
		expect(argv).toContain("docs");
		expect(argv).toContain("--json-progress");
		// Should NOT contain defaults that match CLI defaults
		expect(argv).not.toContain("--depth");
		expect(argv).not.toContain("--max-pages");
		expect(argv).not.toContain("--rate");
	});

	it("always includes --json-progress", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest());
		expect(argv).toContain("--json-progress");
	});

	it("single mode appends --single", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest({ mode: "single" }));
		expect(argv).toContain("--single");
		expect(argv).not.toContain("--refresh");
	});

	it("refresh mode appends --refresh", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest({ mode: "refresh" }));
		expect(argv).toContain("--refresh");
		expect(argv).not.toContain("--single");
	});

	it("refresh with prune appends both flags", () => {
		const settings = makeSettings({ defaultPrune: true });
		const argv = buildArgv(settings, makeRequest({ mode: "refresh" }));
		expect(argv).toContain("--refresh");
		expect(argv).toContain("--prune");
	});

	it("prune is NOT emitted in non-refresh mode", () => {
		const settings = makeSettings({ defaultPrune: true });
		const argv = buildArgv(settings, makeRequest({ mode: "mirror" }));
		expect(argv).not.toContain("--prune");
	});

	it("emits depth when overridden in settings", () => {
		const settings = makeSettings({ defaultDepth: 5 });
		const argv = buildArgv(settings, makeRequest());
		const idx = argv.indexOf("--depth");
		expect(idx).toBeGreaterThan(-1);
		expect(argv[idx + 1]).toBe("5");
	});

	it("emits depth when in request overrides", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest({
			overrides: { defaultDepth: 8 },
		}));
		const idx = argv.indexOf("--depth");
		expect(idx).toBeGreaterThan(-1);
		expect(argv[idx + 1]).toBe("8");
	});

	it("emits max-pages when overridden", () => {
		const settings = makeSettings({ defaultMaxPages: 100 });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--max-pages");
		expect(argv).toContain("100");
	});

	it("emits timeout when non-null", () => {
		const settings = makeSettings({ defaultTimeoutMinutes: 30 });
		const argv = buildArgv(settings, makeRequest());
		const idx = argv.indexOf("--timeout");
		expect(idx).toBeGreaterThan(-1);
		expect(argv[idx + 1]).toBe("30");
	});

	it("omits timeout when null", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest());
		expect(argv).not.toContain("--timeout");
	});

	it("emits repeatable --include flags", () => {
		const settings = makeSettings({ defaultIncludeRegex: ["^https://a/", "^https://b/"] });
		const argv = buildArgv(settings, makeRequest());
		const indices = argv.reduce<number[]>((acc, v, i) => v === "--include" ? [...acc, i] : acc, []);
		expect(indices).toHaveLength(2);
		expect(argv[indices[0]! + 1]).toBe("^https://a/");
		expect(argv[indices[1]! + 1]).toBe("^https://b/");
	});

	it("emits repeatable --exclude flags", () => {
		const settings = makeSettings({ defaultExcludeRegex: ["/login$"] });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--exclude");
		expect(argv).toContain("/login$");
	});

	it("emits repeatable --tag flags", () => {
		const settings = makeSettings({ defaultTags: ["source/web", "reference"] });
		const argv = buildArgv(settings, makeRequest());
		const indices = argv.reduce<number[]>((acc, v, i) => v === "--tag" ? [...acc, i] : acc, []);
		expect(indices).toHaveLength(2);
	});

	it("skips empty repeatable values", () => {
		const settings = makeSettings({ defaultTags: ["", "valid", ""] });
		const argv = buildArgv(settings, makeRequest());
		const indices = argv.reduce<number[]>((acc, v, i) => v === "--tag" ? [...acc, i] : acc, []);
		expect(indices).toHaveLength(1);
		expect(argv[indices[0]! + 1]).toBe("valid");
	});

	it("emits --flat when enabled", () => {
		const settings = makeSettings({ defaultFlat: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--flat");
	});

	it("omits --flat when disabled", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest());
		expect(argv).not.toContain("--flat");
	});

	it("emits --ignore-robots when enabled", () => {
		const settings = makeSettings({ defaultIgnoreRobots: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--ignore-robots");
	});

	it("emits --render-js when enabled", () => {
		const settings = makeSettings({ defaultRenderJs: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--render-js");
	});

	it("emits --user-agent when non-empty", () => {
		const settings = makeSettings({ defaultUserAgent: "MyBot/1.0" });
		const argv = buildArgv(settings, makeRequest());
		const idx = argv.indexOf("--user-agent");
		expect(idx).toBeGreaterThan(-1);
		expect(argv[idx + 1]).toBe("MyBot/1.0");
	});

	it("emits --no-resume when resume is false", () => {
		const settings = makeSettings({ defaultResume: false });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--no-resume");
	});

	it("does not emit --no-resume when resume is true (default)", () => {
		const argv = buildArgv(DEFAULT_SETTINGS, makeRequest());
		expect(argv).not.toContain("--no-resume");
	});

	it("emits --force when enabled", () => {
		const settings = makeSettings({ defaultForce: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--force");
	});

	it("emits --no-manifest when enabled", () => {
		const settings = makeSettings({ defaultNoManifest: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--no-manifest");
	});

	it("emits --no-sitemap when enabled", () => {
		const settings = makeSettings({ defaultNoSitemap: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--no-sitemap");
	});

	it("emits --no-static-boilerplate when enabled", () => {
		const settings = makeSettings({ defaultNoStaticBoilerplate: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--no-static-boilerplate");
	});

	it("emits --no-cross-page-boilerplate when enabled", () => {
		const settings = makeSettings({ defaultNoCrossPageBoilerplate: true });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--no-cross-page-boilerplate");
	});

	it("emits --boilerplate-threshold when overridden", () => {
		const settings = makeSettings({ defaultBoilerplateThreshold: 0.8 });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--boilerplate-threshold");
		expect(argv).toContain("0.8");
	});

	it("overrides shadow settings", () => {
		const settings = makeSettings({ defaultDepth: 5 });
		const argv = buildArgv(settings, makeRequest({
			overrides: { defaultDepth: 10 },
		}));
		const idx = argv.indexOf("--depth");
		expect(idx).toBeGreaterThan(-1);
		expect(argv[idx + 1]).toBe("10");
	});

	it("does not produce empty strings", () => {
		const settings = makeSettings({
			defaultDepth: 5,
			defaultTags: ["a"],
			defaultIncludeRegex: ["^x"],
			defaultUserAgent: "Bot",
		});
		const argv = buildArgv(settings, makeRequest({ mode: "refresh" }));
		for (const arg of argv) {
			expect(arg.length).toBeGreaterThan(0);
		}
	});

	it("emits --link-style when overridden", () => {
		const settings = makeSettings({ defaultLinkStyle: "path" });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--link-style");
		expect(argv).toContain("path");
	});

	it("emits --title-from when overridden", () => {
		const settings = makeSettings({ defaultTitleFrom: "h1" });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--title-from");
		expect(argv).toContain("h1");
	});

	it("emits --subdomain-policy when overridden", () => {
		const settings = makeSettings({ defaultSubdomainPolicy: "strict" });
		const argv = buildArgv(settings, makeRequest());
		expect(argv).toContain("--subdomain-policy");
		expect(argv).toContain("strict");
	});
});
