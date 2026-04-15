import { describe, it, expect, beforeEach, vi } from 'vitest'
import { commentRouter } from './comment.router'

// Mock database and related modules
vi.mock('@/packages/db/db', () => ({
  getDb: vi.fn(() => mockDb),
}))

vi.mock('@/packages/trpc/api/libs/validateCaptcha', () => ({
  validateCaptcha: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/packages/trpc/api/libs/sendEmail', () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
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

describe('Comment Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('index procedure', () => {
    it('should return comment list', async () => {
      const mockComments = [
        { id: '1', content: 'Comment 1', status: 'PUBLISH', createdAt: new Date() },
        { id: '2', content: 'Comment 2', status: 'PUBLISH', createdAt: new Date() },
      ]
      const mockCount = [{ count: '2' }]

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce(mockComments as any)

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockCount as any)

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.index({ page: 1, limit: 10 })

      expect(result).toEqual({
        list: mockComments,
        total: 2,
      })
    })
  })

  describe('create procedure', () => {
    it('should create comment with captcha validation', async () => {
      const newComment = { id: '1', content: 'New Comment', status: 'PUBLISH' }

      mockDb.insert.mockReturnValueOnce(mockDb)
      mockDb.values.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([newComment] as any)

      // Mock the second query for getting the created comment with refs
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([newComment] as any)

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.create({
        content: 'New Comment',
        captchaToken: 'valid-captcha',
      })

      expect(result).toBeDefined()
      expect(validateCaptcha).toHaveBeenCalledWith('valid-captcha')
    })
  })

  describe('update procedure', () => {
    it('should update comment with admin permissions', async () => {
      const updatedComment = { id: '1', content: 'Updated Comment', status: 'PUBLISH' }

      mockDb.update.mockReturnValueOnce(mockDb)
      mockDb.set.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([updatedComment] as any)

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.update({
        id: '111111111111111111111',
        content: 'Updated Comment',
      })

      expect(result).toEqual(updatedComment)
      expect(mockDb.update).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(
        caller.update({
          id: '111111111111111111111',
          content: 'Updated Comment',
        })
      ).rejects.toThrow()
    })
  })

  describe('destroy procedure', () => {
    it('should delete comments with admin permissions', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(undefined as any)

      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.destroy({ 
        ids: ['111111111111111111111', '222222222222222222222'] 
      })

      expect(result).toEqual({ success: true })
      expect(mockDb.delete).toHaveBeenCalledWith(expect.any(Object))
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = commentRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(
        caller.destroy({ 
          ids: ['111111111111111111111', '222222222222222222222'] 
        })
      ).rejects.toThrow()
    })
  })
})
