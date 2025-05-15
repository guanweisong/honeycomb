import type { PaginationResponse } from "@/src/types/PaginationResponse";
import type { CategoryEntity } from "./category.entity";

export interface CategoryIndexResponse
  extends PaginationResponse<CategoryEntity> {}
