import { z } from "zod";
import { MenuWriteSchema } from "./menu.write.schema";

export const MenuSaveSnapshotSchema = z.strictObject({
  expectedVersion: z.number().int().nonnegative(),
  items: MenuWriteSchema,
});
