import { z } from "zod";
import { I18nSchema } from "@/lib/validation/validation";

/** 标签写入字段的唯一运行时契约。 */
export const TagInsertSchema = z.object({ name: I18nSchema });
