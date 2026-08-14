import { UserLevel } from "@/packages/domain/identity/user";
import type { Context } from "./context";

/** 权限矩阵测试的外部边界计数。 */
export interface BoundaryCounts {
  database: number;
  hash: number;
  storage: number;
}

/** 创建一个访问即失败的数据库边界。 */
export function createDatabaseBoundary(counts: BoundaryCounts): Context["db"] {
  return new Proxy({} as Context["db"], {
    get: (_target, property) => {
      counts.database += 1;
      throw new Error(`database boundary reached: ${String(property)}`);
    },
  });
}

/** 创建权限矩阵调用上下文。 */
export function createContext(level: UserLevel, db: Context["db"]): Context {
  return {
    db,
    user: { id: "matrix-user", level },
    hasRequest: true,
    header: new Headers(),
    requestId: "req-capability-matrix",
  };
}

/** 为矩阵条目选择一个不具备目标权限的已认证角色。 */
export function deniedRoleFor(allowedRoles: readonly UserLevel[]): UserLevel {
  if (!allowedRoles.includes(UserLevel.EDITOR)) return UserLevel.EDITOR;
  if (!allowedRoles.includes(UserLevel.GUEST)) return UserLevel.GUEST;
  return "UNKNOWN_AUTHENTICATED_ROLE" as UserLevel;
}

/** 合并数据库边界计数与外部边界计数。 */
export function boundaryCounts(
  external: Pick<BoundaryCounts, "hash" | "storage">,
  database = 0,
): BoundaryCounts {
  return { database, hash: external.hash, storage: external.storage };
}

/** 调用 appRouter 中的矩阵目标 procedure。 */
export function callActualProcedure(
  appRouter: { createCaller: (context: Context) => unknown },
  path: string,
  context: Context,
  input: unknown,
): Promise<unknown> {
  const [routerName, procedureName] = path.split(".");
  const caller = appRouter.createCaller(context) as Record<
    string,
    Record<string, (value?: unknown) => Promise<unknown>>
  >;
  const procedure = caller[routerName]?.[procedureName];
  if (!procedure) throw new Error(`Unknown appRouter procedure: ${path}`);
  return input === undefined ? procedure() : procedure(input);
}
