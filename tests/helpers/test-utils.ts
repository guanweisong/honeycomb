import { vi, type Mock } from "vitest";
import type { User } from "@/packages/trpc/api/context";
import type { Context } from "@/packages/trpc/api/context";

type MockQueryModel = {
  findMany: Mock
  findFirst: Mock
}

type MockQuery = {
  comment: MockQueryModel
  page: MockQueryModel
  post: MockQueryModel
  menu: MockQueryModel
}

export type MockDb = {
  select: Mock
  from: Mock
  where: Mock
  leftJoin: Mock
  orderBy: Mock
  limit: Mock
  offset: Mock
  insert: Mock
  values: Mock
  returning: Mock
  delete: Mock
  update: Mock
  set: Mock
  batch: Mock
  resultKind: Mock
  _: Mock
  prepare: Mock
  run: Mock
  all: Mock
  get: Mock
  dbValues: Mock
  execute: Mock
  transaction: Mock
  rollback: Mock
  commit: Mock
  query: MockQuery
}

export const createMockDb = (): MockDb => {
  const mockDb = {} as MockDb
  const chain = () => mockDb
  const queryChain = () => mockDb

  mockDb.select = vi.fn(chain)
  mockDb.from = vi.fn(chain)
  mockDb.where = vi.fn(chain)
  mockDb.leftJoin = vi.fn(chain)
  mockDb.orderBy = vi.fn(chain)
  mockDb.limit = vi.fn(chain)
  mockDb.offset = vi.fn(chain)
  mockDb.insert = vi.fn(chain)
  mockDb.values = vi.fn(chain)
  mockDb.returning = vi.fn(chain)
  mockDb.delete = vi.fn(chain)
  mockDb.update = vi.fn(chain)
  mockDb.set = vi.fn(chain)
  mockDb.batch = vi.fn(chain)
  mockDb.resultKind = vi.fn(chain)
  mockDb._ = vi.fn(chain)
  mockDb.prepare = vi.fn(chain)
  mockDb.run = vi.fn(chain)
  mockDb.all = vi.fn(chain)
  mockDb.get = vi.fn(chain)
  mockDb.dbValues = vi.fn(chain)
  mockDb.execute = vi.fn(chain)
  mockDb.transaction = vi.fn(chain)
  mockDb.rollback = vi.fn(chain)
  mockDb.commit = vi.fn(chain)
  mockDb.query = {
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
  }

  return mockDb
}

export const resetMockDb = (mockDb: MockDb) => {
  const reset = (mock: Mock) => {
    mock.mockReset()
    mock.mockReturnValue(mockDb)
  }

  reset(mockDb.select)
  reset(mockDb.from)
  reset(mockDb.where)
  reset(mockDb.leftJoin)
  reset(mockDb.orderBy)
  reset(mockDb.limit)
  reset(mockDb.offset)
  reset(mockDb.insert)
  reset(mockDb.values)
  reset(mockDb.returning)
  reset(mockDb.delete)
  reset(mockDb.update)
  reset(mockDb.set)
  reset(mockDb.batch)
  reset(mockDb.resultKind)
  reset(mockDb._)
  reset(mockDb.prepare)
  reset(mockDb.run)
  reset(mockDb.all)
  reset(mockDb.get)
  reset(mockDb.dbValues)
  reset(mockDb.execute)
  reset(mockDb.transaction)
  reset(mockDb.rollback)
  reset(mockDb.commit)

  reset(mockDb.query.comment.findMany)
  reset(mockDb.query.comment.findFirst)
  reset(mockDb.query.page.findMany)
  reset(mockDb.query.page.findFirst)
  reset(mockDb.query.post.findMany)
  reset(mockDb.query.post.findFirst)
  reset(mockDb.query.menu.findMany)
  reset(mockDb.query.menu.findFirst)
}

export const createMockContext = (user?: User | null, db?: MockDb) => ({
  db: (db ?? createMockDb()) as unknown as Context["db"],
  user: user ?? null,
  header: new Headers(),
}) as Context
