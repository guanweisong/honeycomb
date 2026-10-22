import { notFound } from "next/navigation";
import { IdSchema } from "@/lib/validation/id.schema";

/** 在查询前将畸形详情 ID 交给不存在边界，不掩盖查询本身的异常。 */
export function assertDetailId(id: string): void {
  if (!IdSchema.safeParse(id).success) notFound();
}
