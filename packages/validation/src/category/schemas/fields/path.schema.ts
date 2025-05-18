import { z } from "zod";

export const PathSchema = z.string().min(1).max(20, "path最大长度不可超过20");
