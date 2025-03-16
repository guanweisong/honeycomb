import { z } from "zod";

export const IdSchema = z.string().length(24, "id格式不合法");
