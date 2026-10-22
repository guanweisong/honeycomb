import type { UserListQuerySchema } from "../schemas/user.list.schema";
import type { PaginationInput } from "@/lib/validation/pagination";
import type { z } from "zod";

export type UserListInput = PaginationInput & {
  name?: string;
  email?: string;
  status?: string[];
  level?: string[];
};

export type UserListQueryInput = z.output<typeof UserListQuerySchema>;
