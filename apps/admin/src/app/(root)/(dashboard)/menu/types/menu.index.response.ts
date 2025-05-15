import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { MenuEntity } from "./menu.entity";

export interface MenuIndexResponse extends PaginationResponse<MenuEntity> {}
