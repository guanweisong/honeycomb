import { z } from "zod";

export const NameSchema = z.string().max(20, "用户名最大长度不可超过20");
