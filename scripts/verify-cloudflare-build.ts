import { access, readFile, stat } from "node:fs/promises";
import { constants } from "node:fs";
import { join } from "node:path";

const buildDirectory = ".open-next";
const middlewareManifestPath = ".next/server/middleware-manifest.json";
const expectedMatchers = [
  "/api/:path*",
  "/((?!api|trpc|_next|_vercel|admin|.*\\..*).*)",
];

async function assertNonEmptyFile(path: string) {
  try {
    await access(path, constants.R_OK);
    const { size } = await stat(path);

    if (size === 0) {
      throw new Error(`${path} is empty`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Missing required Cloudflare build artifact: ${path} (${reason})`);
  }
}

async function verifyMiddlewareManifest() {
  let manifest: {
    middleware?: Record<
      string,
      { name?: string; matchers?: Array<{ originalSource?: string }> }
    >;
  };

  try {
    manifest = JSON.parse(await readFile(middlewareManifestPath, "utf8"));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to read middleware manifest: ${reason}`);
  }

  const entries = Object.entries(manifest.middleware ?? {});
  if (entries.length !== 1 || entries[0]?.[0] !== "/") {
    throw new Error(
      `Expected exactly one middleware entry at "/", received: ${entries
        .map(([key]) => key)
        .join(", ") || "none"}`,
    );
  }

  const middleware = entries[0][1];
  if (middleware.name !== "middleware") {
    throw new Error(
      `Expected the middleware entry to be named "middleware", received: ${middleware.name ?? "none"}`,
    );
  }

  const matchers = middleware.matchers?.map(({ originalSource }) => originalSource);
  if (
    matchers?.length !== expectedMatchers.length ||
    matchers.some((matcher, index) => matcher !== expectedMatchers[index])
  ) {
    throw new Error(
      `Unexpected middleware matchers: ${JSON.stringify(matchers)}. Expected: ${JSON.stringify(expectedMatchers)}`,
    );
  }
}

await Promise.all([
  assertNonEmptyFile(join(buildDirectory, "worker.js")),
  assertNonEmptyFile(join(buildDirectory, "middleware", "handler.mjs")),
]);
await verifyMiddlewareManifest();

console.log("Cloudflare build artifacts verified.");
