import type { MetricLabels } from "./contracts";
import { metricLabelNames, type MetricLabelName } from "./names";

const REDACTED = "[REDACTED]";
const CIRCULAR = "[Circular]";
const TRUNCATED = "[Truncated]";
const MAX_CONTEXT_DEPTH = 8;
const sensitiveKey = /password|token|cookie|authorization|secret|email|ip(?:address)?$/i;
const restrictedContainerKey = /body|input|params?|parameters?|sql/i;
const metricLabelNameSet = new Set<string>(metricLabelNames);

export type SanitizedContext = Record<string, unknown>;

export interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  cause?: SerializedError | typeof CIRCULAR | typeof TRUNCATED;
}

export function sanitizeContext(context: Record<string, unknown>): SanitizedContext {
  return sanitizeValue(context, new WeakSet(), 0) as SanitizedContext;
}

export function serializeError(
  error: unknown,
  options: { maxCauseDepth?: number } = {},
): SerializedError {
  const maxCauseDepth = options.maxCauseDepth ?? 3;
  return serializeErrorValue(error, new WeakSet(), 0, maxCauseDepth);
}

export function sanitizeMetricLabels(
  labels: MetricLabels | undefined,
): Partial<Record<MetricLabelName, string>> {
  if (!labels) return {};

  const sanitized: Partial<Record<MetricLabelName, string>> = {};
  for (const [key, value] of Object.entries(labels)) {
    if (metricLabelNameSet.has(key) && typeof value === "string") {
      sanitized[key as MetricLabelName] = value;
    }
  }
  return sanitized;
}

function sanitizeValue(
  value: unknown,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") return redactText(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "undefined") return "[Undefined]";
  if (typeof value === "symbol" || typeof value === "function") {
    return `[Unsupported: ${typeof value}]`;
  }
  if (value instanceof Error) return serializeError(value);
  if (depth >= MAX_CONTEXT_DEPTH) return TRUNCATED;
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return CIRCULAR;

  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen, depth + 1));
  }
  if (!isPlainObject(value)) return `[Unsupported: ${objectName(value)}]`;

  const sanitized: SanitizedContext = {};
  for (const [key, nestedValue] of Object.entries(value)) {
    sanitized[key] = sensitiveKey.test(key) || restrictedContainerKey.test(key)
      ? REDACTED
      : sanitizeValue(nestedValue, seen, depth + 1);
  }
  return sanitized;
}

function serializeErrorValue(
  error: unknown,
  seen: WeakSet<object>,
  depth: number,
  maxCauseDepth: number,
): SerializedError {
  if (typeof error !== "object" || error === null) {
    return { name: "Error", message: redactText(String(error)) };
  }
  if (seen.has(error)) {
    return { name: "Error", message: CIRCULAR };
  }

  seen.add(error);
  const record = error as Record<string, unknown>;
  const name = typeof record.name === "string" ? redactText(record.name) : "Error";
  const message = typeof record.message === "string"
    ? redactText(record.message)
    : redactText(String(error));
  const stack = typeof record.stack === "string" ? redactText(record.stack) : undefined;
  const serialized: SerializedError = { name, message, ...(stack ? { stack } : {}) };

  if ("cause" in record) {
    serialized.cause = depth >= maxCauseDepth
      ? TRUNCATED
      : serializeErrorCause(record.cause, seen, depth + 1, maxCauseDepth);
  }
  return serialized;
}

function serializeErrorCause(
  cause: unknown,
  seen: WeakSet<object>,
  depth: number,
  maxCauseDepth: number,
): SerializedError | typeof CIRCULAR | typeof TRUNCATED {
  if (depth > maxCauseDepth) return TRUNCATED;
  if (typeof cause === "object" && cause !== null && seen.has(cause)) {
    return CIRCULAR;
  }
  return serializeErrorValue(cause, seen, depth, maxCauseDepth);
}

function redactText(value: string): string {
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, REDACTED)
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, REDACTED)
    .replace(/(?:authorization|password|token|cookie|secret)\s*[:=]\s*(?:Bearer\s+)?[^\s,;]+/gi, REDACTED);
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function objectName(value: object): string {
  return value.constructor?.name || "Object";
}
