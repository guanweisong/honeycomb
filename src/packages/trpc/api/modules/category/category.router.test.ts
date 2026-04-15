import { describe, it, expect, beforeEach, vi } from 'vitest'
import { categoryRouter } from './category.router'
import * as schema from '@/packages/db/schema'
import { UserLevel } from '@/packages/trpc/api/modules/user/types/user.level'

// Mock database and related modules
vi.mock('@/packages/db/db', () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock('@/packages/trpc/api/libs/tools', () => ({
  buildDrizzleWhere: vi.fn(() => mockDb),
  buildDrizzleOrderBy: vi.fn(() => mockDb),
}))

vi.mock('@/packages/trpc/api/libs/Tools', () => ({
  sonsTree: vi.fn((list) => list),
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

describe('Category Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('index procedure', () => {
    it('should return category list', async () => {
      const mockCategories = [
        { id: '111111111111111111111111', name: 'Category 1', status: 'active', createdAt: new Date() },
        { id: '222222222222222222222222', name: 'Category 2', status: 'active', createdAt: new Date() },
      ]
      const mockCount = [{ count: '2' }]

      // Setup mock chain for category list query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce(mockCategories as any)

      // Setup mock chain for count query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockCount as any)

      const caller = categoryRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.index({ page: 1, limit: 10 })

      expect(result).toEqual({
        list: mockCategories,
        total: 2,
      })
    })
  })

  describe('create procedure', () => {
    it('should create category with admin permissions', async () => {
      const newCategory = { id: '333333333333333333333333', name: 'New Category', status: 'active' }

      mockDb.insert.mockReturnValueOnce(mockDb)
      mockDb.values.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([newCategory] as any)

      const caller = categoryRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.create({
        name: 'New Category',
        status: 'active',
      })

      expect(result).toEqual(newCategory)
      expect(mockDb.insert).toHaveBeenCalledWith(schema.category)
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = categoryRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(
        caller.create({
          name: 'New Category',
          status: 'active',
        })
      ).rejects.toThrow()
    })
  })

  describe('destroy procedure', () => {
    it('should delete categories with admin permissions', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(undefined as any)

      const caller = categoryRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.destroy({ 
        ids: ['111111111111111111111111', '222222222222222222222222'] 
      })

      expect(result).toEqual({ success: true })
      expect(mockDb.delete).toHaveBeenCalledWith(schema.category)
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = categoryRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(
        caller.destroy({ 
          ids: ['111111111111111111111111', '222222222222222222222222'] 
        })
      ).rejects.toThrow()
    })
  })

  describe('update procedure', () => {
    it('should update category with admin permissions', async () => {
      const updatedCategory = { id: '111111111111111111111111', name: 'Updated Category', status: 'active' }

      mockDb.update.mockReturnValueOnce(mockDb)
      mockDb.set.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([updatedCategory] as any)

      const caller = categoryRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.update({ 
        id: '111111111111111111111111', 
        name: 'Updated Category' 
      })

      expect(result).toEqual(updatedCategory)
      expect(mockDb.update).toHaveBeenCalledWith(schema.category)
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = categoryRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(
        caller.update({ 
          id: '111111111111111111111111', 
          name: 'Updated Category' 
        })
      ).rejects.toThrow()
    })
  })
})
