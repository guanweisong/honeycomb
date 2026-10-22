import type { SettingPatchSchema } from "./schema";
import type { z } from "zod";
import type { MultiLang } from "@/lib/i18n/multi-lang";

export interface SettingRecord {
  id: string;
  version: number;
  siteName: MultiLang | null;
  siteSubName: MultiLang | null;
  siteSignature: MultiLang | null;
  siteCopyright: MultiLang | null;
  siteRecordNo: string | null;
  siteRecordUrl: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
export type SettingUpdate = SettingPatch;
export type SettingViewModel = SettingRecord | undefined;

export type SettingPatch = z.output<typeof SettingPatchSchema>;
