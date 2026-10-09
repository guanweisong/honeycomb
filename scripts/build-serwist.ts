import { mkdir, readFile, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import { injectManifest } from "@serwist/build";
import {
  offlinePrecacheUrl,
  pwaGlobIgnores,
} from "@/packages/infrastructure/pwa/precache-config";

const isProduction = process.argv.includes("--production");
const buildDirectory = resolve(".serwist-build");
const workerSource = join(buildDirectory, "sw.js");
const workerOutput = resolve("public/serwist/sw.js");

const bun = (globalThis as typeof globalThis & {
  Bun: {
    build(config: {
      entrypoints: string[];
      outdir: string;
      target: "browser";
      format: "esm";
      minify: boolean;
      sourcemap: "none";
    }): Promise<{ success: boolean; logs: unknown[] }>;
  };
}).Bun;

const bundle = await bun.build({
  entrypoints: ["src/app/sw.ts"],
  outdir: buildDirectory,
  target: "browser",
  format: "esm",
  minify: isProduction,
  sourcemap: "none",
});

if (!bundle.success) {
  for (const log of bundle.logs) console.error(log);
  process.exit(1);
}

await mkdir(resolve("public/serwist"), { recursive: true });
await rm(workerOutput, { force: true });

let revision = "development";
if (isProduction) {
  try {
    revision = (await readFile(resolve(".next/BUILD_ID"), "utf8")).trim();
  } catch {
    revision = "production";
  }
}

await injectManifest({
  swSrc: workerSource,
  swDest: workerOutput,
  globDirectory: process.cwd(),
  globPatterns: isProduction
    ? [".next/static/**/*", "public/**/*"]
    : [],
  globIgnores: [
    ...pwaGlobIgnores,
    ".serwist-build/**/*",
    "public/serwist/**/*",
  ],
  globStrict: false,
  disablePrecacheManifest: !isProduction,
  additionalPrecacheEntries: isProduction
    ? [{ url: offlinePrecacheUrl, revision }]
    : [],
  manifestTransforms: [
    (entries) => ({
      manifest: entries.map((entry) => {
        if (entry.url.startsWith(".next/static/")) {
          return {
            ...entry,
            url: entry.url.replace(/^\.next\/static\//, "/_next/static/"),
          };
        }
        if (entry.url.startsWith("public/")) {
          return { ...entry, url: `/${entry.url.slice("public/".length)}` };
        }
        return entry;
      }),
      warnings: [],
    }),
  ],
});
