"use client";

import { useState } from "react";
import type { MediaIndexInput } from "@/packages/trpc/api/modules/media/schemas/media.list.query.schema";
import { trpc } from "@/packages/trpc/client/trpc";

export function getMediaQueryInput(): MediaIndexInput {
  return { limit: 99999 };
}

export function useMediaQuery() {
  const [searchParams] = useState<MediaIndexInput>(getMediaQueryInput);
  const query = trpc.media.index.useQuery(searchParams);

  return {
    data: query.data,
    refetch: query.refetch,
  };
}
