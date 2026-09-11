import { z } from "zod";
import {
  MAX_QUERY_LENGTH,
  MAX_BATCH_SIZE,
} from "@/packages/application/resource-limits";

export const QueryStringArraySchema = z
  .array(z.string().max(MAX_QUERY_LENGTH))
  .max(MAX_BATCH_SIZE)
  .optional();

export const queryString = () =>
  z
    .string()
    .trim()
    .max(MAX_QUERY_LENGTH)
    .transform((v) => (v === "" ? undefined : v))
    .optional();
