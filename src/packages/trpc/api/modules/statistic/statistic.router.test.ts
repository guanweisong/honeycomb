import { describe, it, expect, beforeEach, vi } from 'vitest'
import { statisticRouter } from './statistic.router'
import { UserLevel } from '@/packages/trpc/api/modules/user/types/user.level'

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

describe('Statistic Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('index procedure', () => {
    it('should return statistics with admin permissions', async () => {
      // Simplified mock - return empty arrays for all queries
      mockDb.select.mockReturnValue(mockDb)
      mockDb.from.mockReturnValue(mockDb)
      mockDb.where.mockReturnValue(mockDb)
      mockDb.where.mockResolvedValue([{ count: '0' }] as any)

      const caller = statisticRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: UserLevel.ADMIN },
        header: new Headers(),
      })

      const result = await caller.index()

      expect(result).toHaveProperty('postType')
      expect(result).toHaveProperty('userType')
      expect(result).toHaveProperty('commentStatus')
      expect(result).toHaveProperty('userPost')
    })

    it('should throw error for non-authenticated users', async () => {
      const caller = statisticRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      await expect(caller.index()).rejects.toThrow()
    })
  })
})
