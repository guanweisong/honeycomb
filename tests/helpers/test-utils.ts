import { vi, type Mock } from "vitest";
import type { User } from "@/packages/trpc/api/context";
import type { Context } from "@/packages/trpc/api/context";
import { UserLevel } from "@/packages/domain/identity/user";
import type { Database } from "@/packages/infrastructure/db/db";

type MockQueryModel = {
  findMany: Mock;
  findFirst: Mock;
};

type MockQuery = {
  comment: MockQueryModel;
  page: MockQueryModel;
  post: MockQueryModel;
  menu: MockQueryModel;
};

export type MockDb = {
  select: Mock;
  from: Mock;
  where: Mock;
  groupBy: Mock;
  leftJoin: Mock;
  orderBy: Mock;
  limit: Mock;
  offset: Mock;
  insert: Mock;
  values: Mock;
  returning: Mock;
  delete: Mock;
  update: Mock;
  set: Mock;
  batch: Mock;
  resultKind: Mock;
  _: Mock;
  prepare: Mock;
  run: Mock;
  all: Mock;
  get: Mock;
  dbValues: Mock;
  execute: Mock;
  transaction: Mock;
  rollback: Mock;
  commit: Mock;
  query: MockQuery;
};

export const createMockDb = (): MockDb => {
  const chain = (): MockDb => mockDb;
  const queryChain = (): MockDb => mockDb;

  const mockDb: MockDb = {
    select: vi.fn(chain),
    from: vi.fn(chain),
    where: vi.fn(chain),
    groupBy: vi.fn(chain),
    leftJoin: vi.fn(chain),
    orderBy: vi.fn(chain),
    limit: vi.fn(chain),
    offset: vi.fn(chain),
    insert: vi.fn(chain),
    values: vi.fn(chain),
    returning: vi.fn(chain),
    delete: vi.fn(chain),
    update: vi.fn(chain),
    set: vi.fn(chain),
    batch: vi.fn(chain),
    resultKind: vi.fn(chain),
    _: vi.fn(chain),
    prepare: vi.fn(chain),
    run: vi.fn(chain),
    all: vi.fn(chain),
    get: vi.fn(chain),
    dbValues: vi.fn(chain),
    execute: vi.fn(chain),
    transaction: vi.fn(async (callback: (tx: MockDb) => unknown) =>
      callback(mockDb),
    ),
    rollback: vi.fn(chain),
    commit: vi.fn(chain),
    query: {
      comment: {
        findMany: vi.fn(queryChain),
        findFirst: vi.fn(queryChain),
      },
      page: {
        findMany: vi.fn(queryChain),
        findFirst: vi.fn(queryChain),
      },
      post: {
        findMany: vi.fn(queryChain),
        findFirst: vi.fn(queryChain),
      },
      menu: {
        findMany: vi.fn(queryChain),
        findFirst: vi.fn(queryChain),
      },
    },
  };

  return mockDb;
};

/** 将链式 mock 集中适配为 Drizzle 数据库；测试不再在每个调用点伪装成 never。 */
export const asMockDatabase = (mockDb: object): Database =>
  mockDb as unknown as Database;

export const resetMockDb = (mockDb: MockDb) => {
  const reset = (mock: Mock) => {
    mock.mockReset();
    mock.mockReturnValue(mockDb);
  };

  reset(mockDb.select);
  reset(mockDb.from);
  reset(mockDb.where);
  reset(mockDb.groupBy);
  reset(mockDb.leftJoin);
  reset(mockDb.orderBy);
  reset(mockDb.limit);
  reset(mockDb.offset);
  reset(mockDb.insert);
  reset(mockDb.values);
  reset(mockDb.returning);
  reset(mockDb.delete);
  reset(mockDb.update);
  reset(mockDb.set);
  reset(mockDb.batch);
  reset(mockDb.resultKind);
  reset(mockDb._);
  reset(mockDb.prepare);
  reset(mockDb.run);
  reset(mockDb.all);
  reset(mockDb.get);
  reset(mockDb.dbValues);
  reset(mockDb.execute);
  mockDb.transaction.mockReset();
  mockDb.transaction.mockImplementation(
    async (callback: (tx: MockDb) => unknown) => callback(mockDb),
  );
  reset(mockDb.rollback);
  reset(mockDb.commit);

  reset(mockDb.query.comment.findMany);
  reset(mockDb.query.comment.findFirst);
  reset(mockDb.query.page.findMany);
  reset(mockDb.query.page.findFirst);
  reset(mockDb.query.post.findMany);
  reset(mockDb.query.post.findFirst);
  reset(mockDb.query.menu.findMany);
  reset(mockDb.query.menu.findFirst);
};

export const createMockContext = (
  user?: User | null,
  db?: MockDb,
): Context => ({
  db: asMockDatabase(db ?? createMockDb()),
  user: user ?? null,
  header: new Headers(),
  hasRequest: false,
  requestId: "test-request",
});

export const createAdminUser = (id: string): User => ({
  id,
  level: UserLevel.ADMIN,
});

export const createGuestUser = (id: string): User => ({
  id,
  level: UserLevel.GUEST,
});
