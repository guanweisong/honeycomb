import { z } from "zod";

export const queryString = () =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .optional();
