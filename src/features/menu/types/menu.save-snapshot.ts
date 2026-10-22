import type { z } from "zod";
import type { MenuSaveSnapshotSchema } from "../schema/menu.save-snapshot.schema";

export type MenuSaveSnapshot = z.output<typeof MenuSaveSnapshotSchema>;
