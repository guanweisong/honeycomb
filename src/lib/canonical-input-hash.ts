import "server-only";
import { createHash } from "node:crypto";

function canonicalInput(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalInput).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, field]) => field !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, field]) => `${JSON.stringify(key)}:${canonicalInput(field)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** 对已校验的原始意图求摘要；保留既有规范化字节，不清洗或替换为存储内容。 */
export function hashCanonicalInput(value: unknown): string {
  return createHash("sha256").update(canonicalInput(value)).digest("hex");
}
