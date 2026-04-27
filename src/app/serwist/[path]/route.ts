import { spawnSync } from "node:child_process";
import { createSerwistRoute } from "@serwist/turbopack";

void spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
});

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
    useNativeEsbuild: true,
  });
