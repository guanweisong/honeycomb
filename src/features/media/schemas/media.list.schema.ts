import { z } from "zod";
import { IdSchema } from "@/lib/validation/id.schema";
import { PaginationQuerySchema } from "@/lib/validation/pagination.query.schema";

export const MediaListQuerySchema = PaginationQuerySchema.partial();

export const MediaIdSchema = z.object({ id: IdSchema });
