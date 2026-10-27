import type { z } from "zod";
import type { MenuSaveSnapshotSchema } from "@/features/menu/schemas/menu.save-snapshot.schema";

export type MenuSaveSnapshot = z.output<typeof MenuSaveSnapshotSchema>;
