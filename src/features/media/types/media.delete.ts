import type { z } from "zod";
import type { PublicCacheInvalidationResult } from "@/lib/cache/public-content-invalidator";
import type { MediaDeleteSchema } from "@/features/media/schemas/media.delete.schema";

export type MediaDeleteInput = z.input<typeof MediaDeleteSchema>;

export type MediaDeleteResult = {
  success: true;
  publicSync?: PublicCacheInvalidationResult["state"];
};
