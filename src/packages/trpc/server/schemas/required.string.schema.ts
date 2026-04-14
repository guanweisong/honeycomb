import { z } from "zod";

export function requiredString(message: string) {
  return z
    .string({
      message: message,
    })
    .trim()
    .min(1, message);
}
