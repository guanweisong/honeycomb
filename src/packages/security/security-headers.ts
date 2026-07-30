import { EnvironmentValidationError, parseR2Env } from "../../env/schema";

export type SecurityHeader = {
  key: string;
  value: string;
};

export type SecurityHeadersOptions = {
  environment?: string;
  siteUrl?: string;
  assetUrl?: string;
  googleAnalyticsEnabled?: boolean;
  turnstileEnabled?: boolean;
  r2UploadOrigin?: string;
  cspReportOnly?: boolean;
};

export type SecurityHeaderEnvironment = Record<string, string | undefined>;

export type AssetRemotePattern = {
  protocol: "http" | "https";
  hostname: string;
  port: string;
};

function parseHttpUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url
      : undefined;
  } catch {
    return undefined;
  }
}

function isConfigured(value: string | undefined) {
  return Boolean(value?.trim());
}

function resolveR2UploadOrigin(environment: SecurityHeaderEnvironment) {
  try {
    const r2 = parseR2Env(environment);
    if (!r2) return undefined;

    const hostname = `${r2.accountId.toLowerCase()}.r2.cloudflarestorage.com`;
    const url = new URL(`https://${hostname}`);

    return url.protocol === "https:" && url.hostname === hostname
      ? url.origin
      : undefined;
  } catch (error) {
    if (error instanceof EnvironmentValidationError) return undefined;
    throw error;
  }
}

function parseR2UploadOrigin(value: string | undefined) {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.origin === value &&
      /^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$/.test(url.hostname)
      ? url.origin
      : undefined;
  } catch {
    return undefined;
  }
}

export function createSecurityHeaderOptions(
  environment: SecurityHeaderEnvironment,
): SecurityHeadersOptions {
  return {
    environment: environment.NODE_ENV,
    siteUrl: environment.NEXT_PUBLIC_SITE_URL,
    assetUrl: environment.NEXT_PUBLIC_ASSET_URL,
    googleAnalyticsEnabled:
      isConfigured(environment.NEXT_PUBLIC_GA_BLOG_ID) ||
      isConfigured(environment.NEXT_PUBLIC_GA_ADMIN_ID),
    turnstileEnabled: isConfigured(environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY),
    r2UploadOrigin: resolveR2UploadOrigin(environment),
    cspReportOnly: environment.CSP_REPORT_ONLY === "true",
  };
}

export function createAssetRemotePattern(
  assetUrl: string | undefined,
): AssetRemotePattern | undefined {
  const url = parseHttpUrl(assetUrl);

  if (!url) {
    return undefined;
  }

  return {
    protocol: url.protocol.slice(0, -1) as AssetRemotePattern["protocol"],
    hostname: url.hostname,
    port: url.port,
  };
}

function directive(name: string, sources: string[]) {
  return `${name} ${[...new Set(sources)].join(" ")}`;
}

function createContentSecurityPolicy({
  environment,
  assetUrl,
  googleAnalyticsEnabled,
  turnstileEnabled,
  r2UploadOrigin,
}: SecurityHeadersOptions) {
  const isDevelopment = environment === "development";
  const isProduction = environment === "production";
  const assetOrigin = parseHttpUrl(assetUrl)?.origin;

  // Both installed Vercel clients use same-origin production scripts/endpoints,
  // and va.vercel-scripts.com for development or DSN-backed scripts.
  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    "https://va.vercel-scripts.com",
  ];
  const imageSources = ["'self'", "blob:", "data:", "https://cravatar.cn"];
  const connectSources = ["'self'"];
  const mediaSources = ["'self'"];
  const frameSources = ["'self'"];

  if (isDevelopment) {
    // React's development diagnostics rely on eval; production never receives it.
    scriptSources.push("'unsafe-eval'");
  }

  if (assetOrigin) {
    imageSources.push(assetOrigin);
    mediaSources.push(assetOrigin);
  }

  if (googleAnalyticsEnabled) {
    scriptSources.push("https://www.googletagmanager.com");
    imageSources.push("https://www.google-analytics.com");
    connectSources.push(
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://www.google.com",
    );
  }

  if (turnstileEnabled) {
    scriptSources.push("https://challenges.cloudflare.com");
    connectSources.push("https://challenges.cloudflare.com");
    frameSources.push("https://challenges.cloudflare.com");
  }

  const safeR2UploadOrigin = parseR2UploadOrigin(r2UploadOrigin);
  if (safeR2UploadOrigin) {
    connectSources.push(safeR2UploadOrigin);
  }

  const directives = [
    directive("default-src", ["'self'"]),
    directive("base-uri", ["'self'"]),
    directive("form-action", ["'self'"]),
    directive("frame-ancestors", ["'none'"]),
    directive("object-src", ["'none'"]),
    directive("script-src", scriptSources),
    directive("style-src", ["'self'", "'unsafe-inline'"]),
    directive("img-src", imageSources),
    directive("font-src", ["'self'", "data:"]),
    directive("connect-src", connectSources),
    directive("media-src", mediaSources),
    directive("frame-src", frameSources),
    directive("worker-src", ["'self'", "blob:"]),
    directive("manifest-src", ["'self'"]),
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  return directives.join("; ");
}

function isHttpsProduction({ environment, siteUrl }: SecurityHeadersOptions) {
  return (
    environment === "production" && parseHttpUrl(siteUrl)?.protocol === "https:"
  );
}

/**
 * Generates static response headers for Next.js configuration.
 *
 * A nonce is intentionally not used: static headers preserve static rendering
 * and CDN cacheability while integrations are limited to explicit origins.
 */
export function createSecurityHeaders(
  options: SecurityHeadersOptions,
): SecurityHeader[] {
  const cspKey =
    options.environment === "production" && options.cspReportOnly
      ? "Content-Security-Policy-Report-Only"
      : "Content-Security-Policy";
  const headers: SecurityHeader[] = [
    {
      key: cspKey,
      value: createContentSecurityPolicy(options),
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    },
    { key: "X-Frame-Options", value: "DENY" },
  ];

  if (isHttpsProduction(options)) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    });
  }

  return headers;
}
