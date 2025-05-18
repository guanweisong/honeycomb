import { z } from "zod";

export const DatetimeSchema = z.string().datetime();
