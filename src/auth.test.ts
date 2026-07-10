import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { createMockDb } from "../tests/helpers/test-utils";
import { TEST_IDS } from "../tests/helpers/test-constants";

const mockDb = createMockDb();

const capturedAuthOptions = { authOptions: null as unknown };
const nextAuthMock = vi.fn((authOptions) => {
  capturedAuthOptions.authOptions = authOptions;
  return {
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
});
const mockValidateCaptcha = vi.fn().mockResolvedValue(undefined);
const mockCompare = vi.fn();

const mockCredentialsProvider = vi.fn((config) => ({
  type: "credentials",
  ...config,
}));
const mockAppleProvider = vi.fn((config) => ({
  type: "apple",
  ...config,
}));
const mockGoogleProvider = vi.fn((config) => ({
  type: "google",
  ...config,
}));
const mockGitHubProvider = vi.fn((config) => ({
  type: "github",
  ...config,
}));

type CapturedAuthOptions = {
  secret?: string;
  providers: Array<{
    type: string;
    authorize?: (credentials: {
      name?: string;
      password?: string;
      captchaToken?: string;
    }) => Promise<unknown>;
  }>;
  callbacks: {
    jwt: (args: {
      token: Record<string, unknown>;
      user?: {
        id: string;
        level: string;
        name: string | null;
        email: string | null;
      };
    }) => Promise<Record<string, unknown>>;
    session: (args: {
      session: { user?: Record<string, unknown> };
      token: Record<string, unknown>;
    }) => Promise<{ user?: Record<string, unknown> }>;
    signIn: (args: {
      user: { name?: string | null; email?: string | null; id?: string; level?: string };
      account?: { provider?: string };
      profile?: { email?: string | null };
    }) => Promise<boolean>;
  };
};

vi.mock("next-auth", () => ({
  default: nextAuthMock,
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: mockCredentialsProvider,
}));

vi.mock("next-auth/providers/apple", () => ({
  default: mockAppleProvider,
}));

vi.mock("next-auth/providers/google", () => ({
  default: mockGoogleProvider,
}));

vi.mock("next-auth/providers/github", () => ({
  default: mockGitHubProvider,
}));

vi.mock("@/packages/db/db", () => ({
  getDb: vi.fn(() => mockDb),
}));

vi.mock("@/packages/db/schema", () => ({
  user: {
    id: { name: "id" },
    email: { name: "email" },
    name: { name: "name" },
    password: { name: "password" },
    level: { name: "level" },
    status: { name: "status" },
  },
}));

vi.mock("@/packages/trpc/api/utils/validateCaptcha", () => ({
  validateCaptcha: mockValidateCaptcha,
}));

vi.mock("bcryptjs", () => ({
  compare: mockCompare,
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  eq: vi.fn((field: unknown, value: unknown) => ({ type: "eq", field, value })),
}));

let authModule: typeof import("./auth");

describe("auth", () => {
  const originalEnv = {
    secret: process.env.AUTH_SECRET,
    appleId: process.env.AUTH_APPLE_ID,
    appleSecret: process.env.AUTH_APPLE_SECRET,
    googleId: process.env.AUTH_GOOGLE_ID,
    googleSecret: process.env.AUTH_GOOGLE_SECRET,
    githubId: process.env.AUTH_GITHUB_ID,
    githubSecret: process.env.AUTH_GITHUB_SECRET,
  };

  beforeEach(() => {
    mockValidateCaptcha.mockReset();
    mockValidateCaptcha.mockResolvedValue(undefined);
    mockCompare.mockReset();
    mockDb.select.mockReset();
    mockDb.from.mockReset();
    mockDb.where.mockReset();
    mockDb.limit.mockReset();
    mockDb.insert.mockReset();
    mockDb.values.mockReset();
    mockDb.returning.mockReset();

    process.env.AUTH_SECRET = "auth-secret";
    process.env.AUTH_APPLE_ID = originalEnv.appleId;
    process.env.AUTH_APPLE_SECRET = originalEnv.appleSecret;
    process.env.AUTH_GOOGLE_ID = originalEnv.googleId;
    process.env.AUTH_GOOGLE_SECRET = originalEnv.googleSecret;
    process.env.AUTH_GITHUB_ID = originalEnv.githubId;
    process.env.AUTH_GITHUB_SECRET = originalEnv.githubSecret;
  });

  afterEach(() => {
    process.env.AUTH_SECRET = originalEnv.secret;
    process.env.AUTH_APPLE_ID = originalEnv.appleId;
    process.env.AUTH_APPLE_SECRET = originalEnv.appleSecret;
    process.env.AUTH_GOOGLE_ID = originalEnv.googleId;
    process.env.AUTH_GOOGLE_SECRET = originalEnv.googleSecret;
    process.env.AUTH_GITHUB_ID = originalEnv.githubId;
    process.env.AUTH_GITHUB_SECRET = originalEnv.githubSecret;
  });

  beforeAll(async () => {
    process.env.AUTH_SECRET = "auth-secret";
    process.env.AUTH_APPLE_ID = "apple-id";
    process.env.AUTH_APPLE_SECRET = "apple-secret";
    process.env.AUTH_GOOGLE_ID = "google-id";
    process.env.AUTH_GOOGLE_SECRET = "google-secret";
    process.env.AUTH_GITHUB_ID = "github-id";
    process.env.AUTH_GITHUB_SECRET = "github-secret";
    authModule = await import("./auth");
  });

  it("builds configured providers and maps session fields", async () => {
    void authModule;
    const options = capturedAuthOptions.authOptions as CapturedAuthOptions;

    expect(nextAuthMock).toHaveBeenCalledTimes(1);
    expect(options.secret).toBe("auth-secret");
    expect(options.providers.map((provider: { type: string }) => provider.type)).toEqual([
      "apple",
      "google",
      "github",
      "credentials",
    ]);
    expect(mockCredentialsProvider).toHaveBeenCalledTimes(1);
    expect(mockAppleProvider).toHaveBeenCalledTimes(1);
    expect(mockGoogleProvider).toHaveBeenCalledTimes(1);
    expect(mockGitHubProvider).toHaveBeenCalledTimes(1);

    await expect(
      options.callbacks.jwt({
        token: {},
        user: {
          id: TEST_IDS.ID_1,
          level: "ADMIN",
          name: "Alice",
          email: "alice@example.com",
        },
      }),
    ).resolves.toMatchObject({
      id: TEST_IDS.ID_1,
      level: "ADMIN",
      name: "Alice",
      email: "alice@example.com",
    });

    await expect(
      options.callbacks.session({
        session: { user: {} },
        token: {
          id: TEST_IDS.ID_1,
          level: "EDITOR",
          name: "Alice",
          email: "alice@example.com",
        },
      }),
    ).resolves.toMatchObject({
      user: {
        id: TEST_IDS.ID_1,
        level: "EDITOR",
        name: "Alice",
        email: "alice@example.com",
      },
    });

  });

  it("syncs oauth users in signIn callback", async () => {
    void authModule;
    const options = capturedAuthOptions.authOptions as CapturedAuthOptions;

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.limit.mockResolvedValueOnce([
      {
        id: TEST_IDS.ID_2,
        name: "Existing User",
        email: "existing@example.com",
        level: "EDITOR",
        status: "ENABLE",
      },
    ]);

    await expect(
      options.callbacks.signIn({
        user: { name: "GitHub User", email: "existing@example.com" },
        account: { provider: "github" },
        profile: { email: "existing@example.com" },
      }),
    ).resolves.toBe(true);

    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.limit.mockResolvedValueOnce([]);
    mockDb.insert.mockReturnValueOnce(mockDb);
    mockDb.values.mockReturnValueOnce(mockDb);
    mockDb.returning.mockResolvedValueOnce([
      {
        id: TEST_IDS.ID_3,
        name: "new-user",
        email: "new@example.com",
        level: "GUEST",
      },
    ]);

    await expect(
      options.callbacks.signIn({
        user: { name: "GitHub User", email: "new@example.com" },
        account: { provider: "github" },
        profile: { email: "new@example.com" },
      }),
    ).resolves.toBe(true);
  });

  it("authorizes credentials users after captcha and password checks", async () => {
    void authModule;
    const options = capturedAuthOptions.authOptions as CapturedAuthOptions;
    const credentialsProvider = options.providers.find(
      (provider: { type: string }) => provider.type === "credentials",
    ) as CapturedAuthOptions["providers"][number];

    mockValidateCaptcha.mockResolvedValueOnce(undefined);
    mockDb.select.mockReturnValueOnce(mockDb);
    mockDb.from.mockReturnValueOnce(mockDb);
    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.limit.mockResolvedValueOnce([
      {
        id: TEST_IDS.ID_4,
        name: "Admin",
        email: "admin@example.com",
        password: "hashed-password",
        level: "ADMIN",
        status: "ENABLE",
      },
    ]);
    mockCompare.mockResolvedValueOnce(true);

    await expect(
      (credentialsProvider.authorize as NonNullable<typeof credentialsProvider.authorize>)({
        name: "Admin",
        password: "plain-password",
        captchaToken: "captcha-token",
      }),
    ).resolves.toMatchObject({
      id: TEST_IDS.ID_4,
      name: "Admin",
      email: "admin@example.com",
      level: "ADMIN",
    });
    expect(mockValidateCaptcha).toHaveBeenCalledWith("captcha-token");
    expect(mockCompare).toHaveBeenCalledWith(
      "plain-password",
      "hashed-password",
    );
  });
});
