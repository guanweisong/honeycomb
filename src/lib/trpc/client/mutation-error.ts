import { z } from "zod";

const trpcErrorCodeSchema = z.object({ data: z.object({ code: z.string() }) });
const determinateRejectionCodes = new Set([
  "BAD_REQUEST",
  "FORBIDDEN",
  "UNAUTHORIZED",
  "NOT_FOUND",
]);

/** 只读取传输层字符串错误码，不推断冲突、未知结果或表单校验策略。 */
export function readTrpcErrorCode(error: unknown): string | undefined {
  const parsed = trpcErrorCodeSchema.safeParse(error);
  return parsed.success ? parsed.data.data.code : undefined;
}

/** 这些错误明确拒绝本次写入；冲突和其他结果仍由调用方分别处理。 */
export function isDeterminateRejectionCode(code: string | undefined): boolean {
  return code !== undefined && determinateRejectionCodes.has(code);
}
