import { z } from "zod";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EnvironmentValidationError,
  parseR2Env,
  parseServerEnv,
} from "./schema";
import { parseClientEnv } from "./client-schema";
import { getDatabaseEnv } from "./server";
import { parseSchema } from "./validation";

const validCoreEnv = {
  NEXT_PUBLIC_SITE_URL: "https://honeycomb.example.com",
  TURSO_URL: "libsql://honeycomb.turso.io",
  TURSO_TOKEN: "turso-token",
  AUTH_SECRET: "auth-secret",
  AUTH_URL: "https://honeycomb.example.com",
};

describe("environment schemas", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("accepts valid site and integration URLs from an injected environment", () => {
    const client = parseClientEnv({
      NEXT_PUBLIC_SITE_URL: validCoreEnv.NEXT_PUBLIC_SITE_URL,
      NEXT_PUBLIC_ASSET_URL: "https://assets.honeycomb.example.com",
    });
    const server = parseServerEnv({
      ...validCoreEnv,
      UPSTASH_REDIS_REST_URL: "https://rapid-otter-123.upstash.io",
      UPSTASH_REDIS_REST_TOKEN: "upstash-token",
    });

    expect(client.NEXT_PUBLIC_SITE_URL).toBe("https://honeycomb.example.com");
    expect(server.upstash?.url).toBe("https://rapid-otter-123.upstash.io");
  });

  it("reports an invalid core URL by name and constraint without echoing its value", () => {
    const unsafeValue = "not-a-url-with-secret-token";

    expect(() =>
      parseServerEnv({ ...validCoreEnv, TURSO_URL: unsafeValue }),
    ).toThrow(EnvironmentValidationError);

    try {
      parseServerEnv({ ...validCoreEnv, TURSO_URL: unsafeValue });
    } catch (error) {
      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as Error).message).toContain("TURSO_URL");
      expect((error as Error).message).not.toContain(unsafeValue);
      expect((error as Error).message).not.toContain("turso-token");
    }
  });

  it("reports missing core variables without reading the process environment", () => {
    expect(() => parseServerEnv({})).toThrow(/NEXT_PUBLIC_SITE_URL/);
  });

  it("marks an entirely absent optional integration as disabled", () => {
    const environment = parseServerEnv(validCoreEnv);

    expect(environment.oauth.google).toBeUndefined();
    expect(environment.r2).toBeUndefined();
    expect(environment.turnstile).toBeUndefined();
    expect(environment.resend).toBeUndefined();
    expect(environment.upstash).toBeUndefined();
  });

  it("rejects a partially configured optional integration without echoing its secret", () => {
    const unsafeValue = "google-secret-that-must-not-be-echoed";

    expect(() =>
      parseServerEnv({
        ...validCoreEnv,
        AUTH_GOOGLE_SECRET: unsafeValue,
      }),
    ).toThrow(/AUTH_GOOGLE_ID/);

    try {
      parseServerEnv({
        ...validCoreEnv,
        AUTH_GOOGLE_SECRET: unsafeValue,
      });
    } catch (error) {
      expect((error as Error).message).not.toContain(unsafeValue);
    }
  });

  it("accepts a fully configured optional integration", () => {
    const environment = parseServerEnv({
      ...validCoreEnv,
      AUTH_GOOGLE_ID: "google-client-id",
      AUTH_GOOGLE_SECRET: "google-secret",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "turnstile-site-key",
      TURNSTILE_SECRET_KEY: "turnstile-secret",
    });

    expect(environment.oauth.google).toEqual({
      clientId: "google-client-id",
      clientSecret: "google-secret",
    });
    expect(environment.turnstile).toEqual({
      siteKey: "turnstile-site-key",
      secretKey: "turnstile-secret",
    });
  });

  it("rejects an R2 account ID that cannot be a Cloudflare account hostname", () => {
    expect(() =>
      parseR2Env({
        R2_ACCOUNT_ID: "attacker.test; connect-src https://attacker.test",
        R2_ACCESS_KEY_ID: "access-key",
        R2_SECRET_ACCESS_KEY: "secret-key",
        R2_BUCKET_NAME: "bucket",
      }),
    ).toThrow(/accountId/);
  });

  it("reads database credentials from the process environment", () => {
    vi.stubEnv("TURSO_URL", "libsql://honeycomb.turso.io");
    vi.stubEnv("TURSO_TOKEN", "database-token");

    expect(getDatabaseEnv()).toEqual({
      TURSO_URL: "libsql://honeycomb.turso.io",
      TURSO_TOKEN: "database-token",
    });
  });

  it("names a root-level validation issue as the environment", () => {
    expect(() => parseSchema(z.string(), {})).toThrow(
      "environment: Invalid input: expected string, received object",
    );
  });
});
