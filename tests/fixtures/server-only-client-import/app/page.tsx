"use client";

import { getLogger } from "../../../../src/packages/observability/server";

export default function Page() {
  return <p>{typeof getLogger}</p>;
}
