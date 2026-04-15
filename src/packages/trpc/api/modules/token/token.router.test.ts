import { describe, it, expect, beforeEach, vi } from 'vitest'
import { tokenRouter } from './token.router'
import { UserLevel } from '@/packages/trpc/api/modules/user/types/user.level'
import { TEST_IDS } from '@/tests/setup/test-constants'

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

describe('Token Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('index procedure', () => {
    it('should return token list with admin permissions', async () => {
      const mockTokens = [
        { id: TEST_IDS.ID_1, content: 'token1', userId: 'user1', createdAt: new Date() },
        { id: TEST_IDS.ID_2, content: 'token2', userId: 'user2', createdAt: new Date() },
      ]
      const mockCount = [{ count: '2' }]

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce(mockTokens as any)

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockCount as any)

      const caller = tokenRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_1, level: UserLevel.ADMIN },
        header: new Headers(),
      })

      const result = await caller.index({ page: 1, limit: 10 })

      expect(result).toEqual({
        list: mockTokens,
        total: 2,
      })
    })

    it('should throw error for non-admin users', async () => {
      const caller = tokenRouter.createCaller({
        db: mockDb as any,
        user: { id: TEST_IDS.ID_2, level: 'USER' },
        header: new Headers(),
      })

      await expect(caller.index({ page: 1, limit: 10 })).rejects.toThrow()
    })

    it('should throw error for unauthenticated users', async () => {
      const caller = tokenRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      await expect(caller.index({ page: 1, limit: 10 })).rejects.toThrow()
    })
  })
})
