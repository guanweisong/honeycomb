import { describe, it, expect, beforeEach, vi } from 'vitest'
import { buildCategoryFilter, buildTagFilter, buildAuthorFilter } from './filters'
import { TEST_IDS } from '@/tests/setup/test-constants'

// Mock database
const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
} as any

vi.mock('@/packages/db/schema', () => ({
  category: { parent: 'parent' },
  tag: { name: 'name' },
  user: { name: 'name' },
}))

vi.mock('@/packages/trpc/api/libs/tools', () => ({
  buildDrizzleWhere: vi.fn(() => ({ name: 'test' })),
}))

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}))

describe('Post Filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildCategoryFilter', () => {
    it('should return category ID with subcategories', async () => {
      const mockSubCategories = [
        { id: TEST_IDS.ID_2, parent: TEST_IDS.ID_1 },
        { id: TEST_IDS.ID_1, parent: TEST_IDS.ID_1 },
      ]

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockSubCategories as any)

      const result = await buildCategoryFilter(mockDb as any, TEST_IDS.ID_1)

      expect(result).toEqual([TEST_IDS.ID_1, TEST_IDS.ID_2, TEST_IDS.ID_1])
    })

    it('should return only parent ID when no subcategories', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce([] as any)

      const result = await buildCategoryFilter(mockDb as any, TEST_IDS.ID_1)

      expect(result).toEqual([TEST_IDS.ID_1])
    })
  })

  describe('buildTagFilter', () => {
    it('should return tag ID when tag exists', async () => {
      const mockTags = [
        { id: TEST_IDS.ID_1, name: 'test-tag' },
      ]

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce(mockTags as any)

      const result = await buildTagFilter(mockDb as any, 'test-tag')

      expect(result).toBe(TEST_IDS.ID_1)
    })

    it('should return null when tag does not exist', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([] as any)

      const result = await buildTagFilter(mockDb as any, 'nonexistent-tag')

      expect(result).toBeNull()
    })
  })

  describe('buildAuthorFilter', () => {
    it('should return user ID when user exists', async () => {
      const mockUsers = [
        { id: TEST_IDS.ID_1, name: 'test-author' },
      ]

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockUsers as any)

      const result = await buildAuthorFilter(mockDb as any, 'test-author')

      expect(result).toBe(TEST_IDS.ID_1)
    })

    it('should return null when user does not exist', async () => {
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce([] as any)

      const result = await buildAuthorFilter(mockDb as any, 'nonexistent-author')

      expect(result).toBeNull()
    })
  })
})
