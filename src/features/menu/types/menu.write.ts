import type { z } from "zod";
import type { MenuWriteSchema } from "../schemas/menu.write.schema";

export type MenuInput = z.output<typeof MenuWriteSchema>;
