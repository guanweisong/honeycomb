import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mediaRouter } from './media.router'

// Mock database and related modules
vi.mock('@/packages/db/db', () => ({
  getDb: vi.fn(() => mockDb),
}))

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
}

describe('Media Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('index procedure', () => {
    it('should create caller successfully', async () => {
      const caller = mediaRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      expect(caller).toBeDefined()
      expect(typeof caller.index).toBe('function')
    })
  })
})
