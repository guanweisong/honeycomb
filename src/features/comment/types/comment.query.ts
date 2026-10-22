import type { MenuType } from "@/features/menu/types/menu.type";
import type { PaginationInput } from "@/lib/validation/pagination";

export type CommentListInput = PaginationInput & {
  content?: string;
  status?: string[];
  email?: string;
  ip?: string;
  author?: string;
};

export type CommentRefInput = { id: string; type: `${MenuType}` };
