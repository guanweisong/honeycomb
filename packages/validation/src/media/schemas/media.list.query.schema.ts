import { PaginationQuerySchema } from "../../schemas/pagination.query.schema";
import { CleanZod } from "@honeycomb/validation/clean.zod";

export const MediaListQuerySchema = PaginationQuerySchema.extend({});

export type MediaIndexInput = CleanZod<typeof MediaListQuerySchema>;
