import { getServerEnv } from "./env/server";

export function register() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    getServerEnv();
  }
}
