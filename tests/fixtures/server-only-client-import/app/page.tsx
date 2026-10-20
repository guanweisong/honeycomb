"use client";

import { getLogger } from "../../../../src/lib/observability/server";

export default function Page() {
  return <p>{typeof getLogger}</p>;
}
