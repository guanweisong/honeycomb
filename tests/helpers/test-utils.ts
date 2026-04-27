import { vi, type Mock } from "vitest";
import type { User } from "@/packages/trpc/api/context";
import type { Context } from "@/packages/trpc/api/context";

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
  query: Mock
  prepare: Mock
  run: Mock
  all: Mock
  get: Mock
  dbValues: Mock
  execute: Mock
  transaction: Mock
  rollback: Mock
  commit: Mock
}

export const createMockDb = (): MockDb => {
  const mockDb = {} as MockDb
  const chain = () => mockDb

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
  mockDb.query = vi.fn(chain)
  mockDb.prepare = vi.fn(chain)
  mockDb.run = vi.fn(chain)
  mockDb.all = vi.fn(chain)
  mockDb.get = vi.fn(chain)
  mockDb.dbValues = vi.fn(chain)
  mockDb.execute = vi.fn(chain)
  mockDb.transaction = vi.fn(chain)
  mockDb.rollback = vi.fn(chain)
  mockDb.commit = vi.fn(chain)

  return mockDb
}

export const createMockContext = (user?: User | null, db?: MockDb) => ({
  db: (db ?? createMockDb()) as unknown as Context["db"],
  user: user ?? null,
  header: new Headers(),
}) as Context
