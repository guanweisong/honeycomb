"use client";

import { getLogger } from "../../../../src/packages/infrastructure/observability/server";

export default function Page() {
  return <p>{typeof getLogger}</p>;
}
