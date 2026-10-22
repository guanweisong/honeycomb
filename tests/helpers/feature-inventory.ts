import { readdirSync } from "node:fs";
import { join } from "node:path";
import { sourceFiles } from "./source-files";

/** Discover responsibilities that exist; a feature need not implement every role. */
export function featureInventory(root: string) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      files: sourceFiles(join(root, entry.name)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function isFeatureRouter(path: string) {
  return /(?:^|\/|\.)router\.ts$/.test(path);
}

export function isAuthoritativeContract(path: string) {
  return /^src\/features\/[^/]+\/(?:types|schemas)\/[^/]+\.ts$/.test(path);
}

/** Display-only enum files remain pure but cannot become business dependencies. */
export function isDisplayContract(path: string) {
  return /\/types\/(?:[^/]+-name|post-info\.align)(?:\.tsx?)?$/.test(path);
}
