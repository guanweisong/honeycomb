import { UserLevel } from "@/packages/domain/identity/user";
import type { Context } from "./context";

export interface RouterSource {
  moduleSpecifier: string;
  fileName: string;
  source: string;
}

/** 规范化静态权限矩阵并拒绝重复 procedure。 */
export function normalizeDeclarationMatrix<
  T extends readonly [path: string, permission: string],
>(matrix: readonly T[]): T[] {
  const seenPaths = new Set<string>();
  return matrix
    .map(([path, permission]) => {
      if (seenPaths.has(path)) {
        throw new Error(`Duplicate protected procedure path: ${path}`);
      }
      seenPaths.add(path);
      return [path, permission] as unknown as T;
    })
    .sort(([left], [right]) => left.localeCompare(right));
}

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

/** 加载已注册的 package 与 feature Router 源码，供静态矩阵断言使用。 */
export function loadRouterSources(): RouterSource[] {
  const modulesDirectory = join(process.cwd(), "src/packages/trpc/api/modules");
  const packageRouters = readdirSync(modulesDirectory, { withFileTypes: true }).flatMap(
    (directory) => {
      if (!directory.isDirectory()) return [];
      const moduleDirectory = join(modulesDirectory, directory.name);
      return readdirSync(moduleDirectory)
        .filter((fileName) => fileName.endsWith(".router.ts"))
        .map((fileName) => ({
          moduleSpecifier: `@/packages/trpc/api/modules/${directory.name}/${fileName.slice(0, -3)}`,
          fileName,
          source: readFileSync(join(moduleDirectory, fileName), "utf8"),
        }));
    },
  );

  const featureRouterEntries = [
    ["comment", "comment"], ["post", "post"], ["media", "media"],
    ["link", "link"], ["menu", "menu"], ["page", "page"],
    ["setting", "setting"], ["setting", "statistic"], ["tag", "tag"],
    ["user", "user"], ["user", "account-security"], ["category", "category"],
  ] as const;
  return [
    ...packageRouters,
    ...featureRouterEntries.map(([feature, router]) => ({
      moduleSpecifier: `@/features/${feature}/${router}.router`,
      fileName: `${router}.router.ts`,
      source: readFileSync(join(process.cwd(), "src/features", feature, `${router}.router.ts`), "utf8"),
    })),
  ];
}
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
