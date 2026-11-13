"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useMounted } from "@/lib/hooks/use-mounted";

/** Keep route-aware telemetry out of the prerendered HTML pass. */
export default function BlogObservability() {
  const mounted = useMounted();
  if (!mounted) return null;

  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}
