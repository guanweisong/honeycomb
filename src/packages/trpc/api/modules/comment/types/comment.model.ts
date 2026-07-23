import type { InferSelectModel } from "drizzle-orm";
import * as schema from "@/packages/db/schema";

export type CommentRecord = InferSelectModel<typeof schema.comment>;
