import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";
import {
  offlinePrecacheUrl,
  pwaGlobIgnores,
} from "@/packages/infrastructure/pwa/precache-config";

const revision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout.trim();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
    globIgnores: [...pwaGlobIgnores],
    additionalPrecacheEntries: [
      { url: offlinePrecacheUrl, revision: revision || "development" },
    ],
  });
