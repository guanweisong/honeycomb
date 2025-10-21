import { MenuEntity } from "@honeycomb/validation/menu/schemas/menu.entity.schema";
import { MultiLang } from "@honeycomb/types/multi.lang";

export interface MenuItem extends MenuEntity {
  title: MultiLang;
}
