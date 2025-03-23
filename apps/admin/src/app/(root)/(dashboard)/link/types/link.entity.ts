import type { EnableType } from "@/src/types/EnableType";
import type { BaseEntity } from "@/src/types/BaseEntity";

export interface LinkEntity extends BaseEntity {
  id: string;
  url: string;
  name: string;
  description: string;
  status: EnableType;
}
