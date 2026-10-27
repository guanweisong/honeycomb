import type { LoginSchema } from "@/features/user/login/login.schema";
import type { z } from "zod";

export type LoginValues = z.output<typeof LoginSchema>;
