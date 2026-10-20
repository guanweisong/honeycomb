"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import { type RefObject, useState } from "react";

/** Owns the token lifecycle shared by Turnstile-backed client forms. */
export function useTurnstileToken(
  turnstileRef: RefObject<Pick<TurnstileInstance, "reset"> | null>,
) {
  const [token, setToken] = useState<string | null>(null);

  const reset = () => {
    setToken(null);
    turnstileRef.current?.reset();
  };

  return { token, onSuccess: setToken, reset };
}
