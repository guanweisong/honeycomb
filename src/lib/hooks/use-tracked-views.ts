"use client";

import { useEffect, useRef, useState } from "react";

export interface ViewTrackerProps {
  id: string;
  initialViews?: number;
}

type IncrementViewsMutation = (
  input: { id: string },
  options: { onSuccess: (result: { views?: number | null }) => void },
) => void;

export function useTrackedViews(
  { id, initialViews = 0 }: ViewTrackerProps,
  mutate: IncrementViewsMutation,
) {
  const trackedId = useRef<string | null>(null);
  const [views, setViews] = useState(initialViews);

  useEffect(() => {
    if (trackedId.current === id) return;
    trackedId.current = id;
    setViews(initialViews);
    mutate(
      { id },
      { onSuccess: (result) => setViews(result.views ?? initialViews) },
    );
  }, [id, initialViews, mutate]);

  return views;
}
