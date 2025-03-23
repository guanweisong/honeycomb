import type { BaseEntity } from "@/src/types/BaseEntity";
import { MultiLang } from "@/src/types/MulitLang";

export interface SettingEntity extends BaseEntity {
  id: string;
  siteName: MultiLang;
  siteSubName: MultiLang;
  siteSignature: MultiLang;
  siteCopyright: MultiLang;
  siteRecordNo: string;
  siteRecordUrl: string;
}
