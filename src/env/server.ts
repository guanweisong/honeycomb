import "server-only";

import {
  parseAuthEnv,
  parseBuildAuthEnv,
  parseDatabaseEnv,
  parseR2Env,
  parseResendEnv,
  parseServerEnv,
  parseTurnstileEnv,
  parseUpstashEnv,
} from "./schema";

export function getServerEnv() {
  return parseServerEnv(process.env);
}

export function getDatabaseEnv() {
  return parseDatabaseEnv(process.env);
}

export function getAuthEnv() {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return parseBuildAuthEnv(process.env);
  }

  return parseAuthEnv(process.env);
}

export function getR2Env() {
  return parseR2Env(process.env);
}

export function getTurnstileEnv() {
  return parseTurnstileEnv(process.env);
}

export function getResendEnv() {
  return parseResendEnv(process.env);
}

export function getUpstashEnv() {
  return parseUpstashEnv(process.env);
}
