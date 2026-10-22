import type { LoginSchema } from "../login/login.schema";
import type { z } from "zod";

export type LoginValues = z.output<typeof LoginSchema>;
