import { z } from "zod";

export const PasswordSchema = z.string().min(6, "密码不能少于6位");
