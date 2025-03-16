import { z } from "zod";

export const EmailSchema = z.string().email().max(20, "邮箱最大长度不可超过20");
