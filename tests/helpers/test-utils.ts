import { vi } from 'vitest'

export type MockDb = {
  select: any
  from: any
  where: any
  orderBy: any
  limit: any
  offset: any
  insert: any
  values: any
  returning: any
  delete: any
  update: any
  set: any
  batch: any
  resultKind: any
  _: any
  query: any
  prepare: any
  run: any
  all: any
  get: any
  dbValues: any
  execute: any
  transaction: any
  rollback: any
  commit: any
}

export const createMockDb = (): MockDb => {
  const mockDb = {
    select: vi.fn(() => mockDb),
    from: vi.fn(() => mockDb),
    where: vi.fn(() => mockDb),
    orderBy: vi.fn(() => mockDb),
    limit: vi.fn(() => mockDb),
    offset: vi.fn(() => mockDb),
    insert: vi.fn(() => mockDb),
    values: vi.fn(() => mockDb),
    returning: vi.fn(() => mockDb),
    delete: vi.fn(() => mockDb),
    update: vi.fn(() => mockDb),
    set: vi.fn(() => mockDb),
    batch: vi.fn(() => mockDb),
    resultKind: vi.fn(() => mockDb),
    _: vi.fn(() => mockDb),
    query: vi.fn(() => mockDb),
    prepare: vi.fn(() => mockDb),
    run: vi.fn(() => mockDb),
    all: vi.fn(() => mockDb),
    get: vi.fn(() => mockDb),
    dbValues: vi.fn(() => mockDb),
    execute: vi.fn(() => mockDb),
    transaction: vi.fn(() => mockDb),
    rollback: vi.fn(() => mockDb),
    commit: vi.fn(() => mockDb),
  }
  
  return mockDb as any
}

export const createMockContext = (user?: any, db?: MockDb) => ({
  db: db || createMockDb(),
  user: user || null,
  header: new Headers(),
})
