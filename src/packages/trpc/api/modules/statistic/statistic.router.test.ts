import { describe, it, expect, beforeEach, vi } from 'vitest'
import { statisticRouter } from './statistic.router'
import { UserLevel } from '@/packages/trpc/api/modules/user/types/user.level'
import { createMockContext, createMockDb } from '../../../../../../tests/helpers/test-utils'

// Mock database and related modules
vi.mock('@/packages/db/db', () => ({
  getDb: vi.fn(() => mockDb),
}))

const mockDb = createMockDb()

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
      mockDb.where.mockResolvedValue([{ count: '0' }])

      const caller = statisticRouter.createCaller(createMockContext({ id: '1', level: UserLevel.ADMIN }, mockDb))

      const result = await caller.index()

      expect(result).toHaveProperty('postType')
      expect(result).toHaveProperty('userType')
      expect(result).toHaveProperty('commentStatus')
      expect(result).toHaveProperty('userPost')
    })

    it('should throw error for non-authenticated users', async () => {
      const caller = statisticRouter.createCaller(createMockContext(null, mockDb))

      await expect(caller.index()).rejects.toThrow()
    })
  })
})
