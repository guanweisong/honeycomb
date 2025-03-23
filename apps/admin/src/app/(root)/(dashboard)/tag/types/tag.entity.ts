import type { BaseEntity } from "@/src/types/BaseEntity";
import { MultiLang } from "@/src/types/MulitLang";

export interface TagEntity extends BaseEntity {
  id: string;
  name: MultiLang;
}
