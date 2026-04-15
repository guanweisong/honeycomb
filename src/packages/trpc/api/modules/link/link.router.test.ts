import { describe, it, expect, beforeEach, vi } from 'vitest'
import { linkRouter } from './link.router'

// Mock database and related modules
vi.mock('@/packages/db/db', () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock('@/packages/trpc/api/libs/tools', () => ({
  buildDrizzleWhere: vi.fn(() => mockDb),
  buildDrizzleOrderBy: vi.fn(() => mockDb),
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

describe('Link Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('index procedure', () => {
    it('should return link list', async () => {
      const mockLinks = [
        { id: '1', title: 'Link 1', url: 'https://example1.com', status: 'active', createdAt: new Date() },
        { id: '2', title: 'Link 2', url: 'https://example2.com', status: 'active', createdAt: new Date() },
      ]
      const mockCount = [{ count: '2' }]

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce(mockLinks as any)

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockCount as any)

      const caller = linkRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.index({ page: 1, limit: 10 })

      expect(result).toEqual({
        list: mockLinks,
        total: 2,
      })
    })
  })

  describe('create procedure', () => {
    it('should create link with admin permissions', async () => {
      const newLink = { id: '3', title: 'New Link', url: 'https://example3.com', status: 'active' }

      mockDb.insert.mockReturnValueOnce(mockDb)
      mockDb.values.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([newLink] as any)

      const caller = linkRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.create({
        title: 'New Link',
        url: 'https://example3.com',
        status: 'active',
      })

      expect(result).toEqual(newLink)
    })
  })

  describe('destroy procedure', () => {
    it('should delete links with admin permissions', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(undefined as any)

      const caller = linkRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.destroy({ 
        ids: ['111111111111111111111', '222222222222222222222'] 
      })

      expect(result).toEqual({ success: true })
    })
  })
})
