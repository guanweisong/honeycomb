import type { SettingPatchSchema } from "../schema/setting.patch.schema";
import type { z } from "zod";

export type SettingPatch = z.output<typeof SettingPatchSchema>;

export type SettingUpdate = SettingPatch;
