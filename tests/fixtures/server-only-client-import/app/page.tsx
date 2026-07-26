"use client";

import { getServerEnv } from "../../../../src/env/server";

export default function Page() {
  return <p>{typeof getServerEnv}</p>;
}
