import "server-only";
import type { Database } from "@/lib/db/db";
import { ApplicationError } from "@/lib/errors/application-error";

export type DatabaseTransaction = Parameters<
  Parameters<Database["transaction"]>[0]
>[0];

/** 仅重试业务回调尚未进入的 BEGIN 竞争；回调或提交失败（包括结果未知）绝不重放。 */
export async function transactionWithBeginRetry<T>(
  db: Pick<Database, "transaction">,
  conflictMessage: string,
  operation: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    let entered = false;
    try {
      return await db.transaction((tx) => {
        entered = true;
        return operation(tx);
      });
    } catch (error) {
      const busyAtBegin =
        !entered &&
        error !== null &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "SQLITE_BUSY";
      if (!busyAtBegin) throw error;
      if (attempt >= 3) throw new ApplicationError("CONFLICT", conflictMessage);
      await new Promise((resolve) => setTimeout(resolve, 10 * 2 ** attempt));
    }
  }
}
