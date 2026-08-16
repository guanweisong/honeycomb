import { describe, expect, it } from "vitest";
import {
  createAssetRemotePattern,
  createSecurityHeaderOptions,
  createSecurityHeaders,
} from "./security-headers";

function asRecord(headers: ReturnType<typeof createSecurityHeaders>) {
  return Object.fromEntries(headers.map(({ key, value }) => [key, value]));
}

function getDirectiveSources(csp: string, name: string) {
  const directive = csp
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name} `));

  return directive?.split(/\s+/).slice(1) ?? [];
}

describe("createSecurityHeaders", () => {
  it("enforces a production CSP with only the enabled integration origins", () => {
    const headers = asRecord(
      createSecurityHeaders({
        environment: "production",
        siteUrl: "https://honeycomb.example",
        assetUrl: "https://assets.honeycomb.example/uploads",
        googleAnalyticsEnabled: true,
        turnstileEnabled: true,
      }),
    );

    expect(headers["Content-Security-Policy-Report-Only"]).toBeUndefined();
    expect(headers["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://assets.honeycomb.example",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://www.googletagmanager.com",
    );
    expect(
      getDirectiveSources(headers["Content-Security-Policy"], "connect-src"),
    ).toContain("https://www.googletagmanager.com");
    expect(headers["Content-Security-Policy"]).toContain(
      "https://static.cloudflareinsights.com",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://www.google.com",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://va.vercel-scripts.com",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://challenges.cloudflare.com",
    );
    expect(headers["Content-Security-Policy"]).not.toContain("'unsafe-eval'");
    expect(headers["Strict-Transport-Security"]).toBe(
      "max-age=63072000; includeSubDomains",
    );
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["Permissions-Policy"]).toContain("camera=()");
    expect(headers["X-Frame-Options"]).toBe("DENY");
  });

  it("uses report-only CSP without sending a competing enforced policy", () => {
    const headers = asRecord(
      createSecurityHeaders({
        environment: "production",
        siteUrl: "http://preview.honeycomb.example",
        cspReportOnly: true,
      }),
    );

    expect(headers["Content-Security-Policy"]).toBeUndefined();
    expect(headers["Content-Security-Policy-Report-Only"]).toContain(
      "default-src 'self'",
    );
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("adds only the Next.js development relaxation and never enables HSTS", () => {
    const headers = asRecord(
      createSecurityHeaders({
        environment: "development",
        siteUrl: "https://honeycomb.example",
      }),
    );

    expect(headers["Content-Security-Policy"]).toContain("'unsafe-eval'");
    expect(headers["Content-Security-Policy"]).toContain("object-src 'none'");
    expect(headers["Strict-Transport-Security"]).toBeUndefined();
  });

  it("does not permit optional integration origins when they are disabled", () => {
    const headers = asRecord(
      createSecurityHeaders({
        environment: "production",
        siteUrl: "https://honeycomb.example",
        assetUrl: "not a URL",
      }),
    );

    expect(headers["Content-Security-Policy"]).not.toContain(
      "googletagmanager.com",
    );
    expect(headers["Content-Security-Policy"]).not.toContain(
      "google-analytics.com",
    );
    expect(headers["Content-Security-Policy"]).toContain(
      "https://va.vercel-scripts.com",
    );
    expect(headers["Content-Security-Policy"]).not.toContain(
      "challenges.cloudflare.com",
    );
    expect(headers["Content-Security-Policy"]).not.toContain("not a URL");
  });

  it("allows the exact R2 upload origin in connect-src", () => {
    const headers = asRecord(
      createSecurityHeaders({
        environment: "production",
        siteUrl: "https://honeycomb.example",
        r2UploadOrigin:
          "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
      }),
    );

    expect(
      getDirectiveSources(headers["Content-Security-Policy"], "connect-src"),
    ).toContain(
      "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
    );
  });

  it("allows the configured asset origin in connect-src for fetched media", () => {
    const headers = asRecord(
      createSecurityHeaders({
        environment: "production",
        siteUrl: "https://honeycomb.example",
        assetUrl: "https://static.honeycomb.example/common/rainAndBird.mp4",
      }),
    );

    expect(
      getDirectiveSources(headers["Content-Security-Policy"], "connect-src"),
    ).toContain("https://static.honeycomb.example");
  });

  it("does not inject an untrusted R2 option into connect-src", () => {
    const headers = asRecord(
      createSecurityHeaders({
        environment: "production",
        r2UploadOrigin: "https://safe.test; connect-src https://attacker.test",
      }),
    );

    expect(
      getDirectiveSources(headers["Content-Security-Policy"], "connect-src"),
    ).toEqual(["'self'", "https://static.cloudflareinsights.com"]);
    expect(headers["Content-Security-Policy"]).not.toContain("attacker.test");
  });
});

describe("createSecurityHeaderOptions", () => {
  it("does not enable integrations without their public configuration", () => {
    expect(
      createSecurityHeaderOptions({
        NODE_ENV: "production",
        NEXT_PUBLIC_SITE_URL: "https://honeycomb.example",
      }),
    ).toMatchObject({
      googleAnalyticsEnabled: false,
      turnstileEnabled: false,
    });
  });

  it.each(["NEXT_PUBLIC_GA_BLOG_ID", "NEXT_PUBLIC_GA_ADMIN_ID"] as const)(
    "enables Analytics when %s is configured",
    (key) => {
      expect(createSecurityHeaderOptions({ [key]: "G-TEST" })).toMatchObject({
        googleAnalyticsEnabled: true,
        turnstileEnabled: false,
      });
    },
  );

  it("enables Turnstile only when its site key is configured", () => {
    expect(
      createSecurityHeaderOptions({
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: "test-site-key",
      }),
    ).toMatchObject({
      googleAnalyticsEnabled: false,
      turnstileEnabled: true,
    });
  });

  it("derives only the R2 upload origin from complete valid configuration", () => {
    const options = createSecurityHeaderOptions({
      R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      R2_ACCESS_KEY_ID: "access-key-must-not-leak",
      R2_SECRET_ACCESS_KEY: "secret-key-must-not-leak",
      R2_BUCKET_NAME: "bucket-must-not-leak",
    });

    expect(options).toMatchObject({
      r2UploadOrigin:
        "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
    });
    expect(JSON.stringify(options)).not.toContain("access-key-must-not-leak");
    expect(JSON.stringify(options)).not.toContain("secret-key-must-not-leak");
    expect(JSON.stringify(options)).not.toContain("bucket-must-not-leak");
  });

  it.each([
    {
      name: "disabled",
      environment: {},
    },
    {
      name: "partially configured",
      environment: {
        R2_ACCOUNT_ID: "0123456789abcdef0123456789abcdef",
      },
    },
    {
      name: "invalid account ID",
      environment: {
        R2_ACCOUNT_ID: "attacker.example; connect-src https://attacker.test",
        R2_ACCESS_KEY_ID: "access-key",
        R2_SECRET_ACCESS_KEY: "secret-key",
        R2_BUCKET_NAME: "bucket",
      },
    },
  ])("does not derive an R2 origin when R2 is $name", ({ environment }) => {
    expect(
      createSecurityHeaderOptions(environment).r2UploadOrigin,
    ).toBeUndefined();
  });
});

describe("createAssetRemotePattern", () => {
  it("returns an image pattern for a valid HTTP asset URL", () => {
    expect(
      createAssetRemotePattern("https://assets.honeycomb.example:8443/files"),
    ).toEqual({
      protocol: "https",
      hostname: "assets.honeycomb.example",
      port: "8443",
    });
  });

  it("ignores invalid and non-HTTP asset URLs", () => {
    expect(createAssetRemotePattern("not a URL")).toBeUndefined();
    expect(createAssetRemotePattern("file:///tmp/assets")).toBeUndefined();
  });
});
