import { describe, it, expect, beforeEach, vi } from 'vitest'
import { userRouter } from './user.router'
import { TRPCError } from '@trpc/server'
import * as schema from '@/packages/db/schema'

// Mock the database and related modules
vi.mock('@/packages/db/db', () => ({
  getDb: vi.fn(() => mockDb),
}))

// Mock the tools module
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

describe('User Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('index procedure', () => {
    it('should return user list with pagination', async () => {
      const mockUsers = [
        { id: '1', name: 'User 1', level: 'USER', status: 'active', createdAt: new Date() },
        { id: '2', name: 'User 2', level: 'ADMIN', status: 'active', createdAt: new Date() },
      ]
      const mockCount = [{ count: '2' }]

      // Setup mock chain for user list query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce(mockUsers as any)

      // Setup mock chain for count query
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockCount as any)

      // Create caller with mock context
      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.index({ page: 1, limit: 10 })

      expect(result).toEqual({
        list: mockUsers,
        total: 2,
      })
    })

    it('should handle empty user list', async () => {
      const mockUsers: any[] = []
      const mockCount = [{ count: '0' }]

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.orderBy.mockReturnValueOnce(mockDb)
      mockDb.limit.mockReturnValueOnce(mockDb)
      mockDb.offset.mockResolvedValueOnce(mockUsers)

      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(mockCount as any)

      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.index({ page: 1, limit: 10 })

      expect(result).toEqual({
        list: [],
        total: 0,
      })
    })
  })

  describe('create procedure', () => {
    it('should create a new user with admin permissions', async () => {
      const newUser = { id: '3', name: 'New User', level: 'USER', status: 'active' }

      mockDb.insert.mockReturnValueOnce(mockDb)
      mockDb.values.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([newUser] as any)

      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.create({
        name: 'New User',
        email: 'newuser@example.com',
        password: 'password123',
        level: 'USER',
        status: 'active',
      })

      expect(result).toEqual(newUser)
      expect(mockDb.insert).toHaveBeenCalledWith(schema.user)
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(
        caller.create({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          level: 'USER',
          status: 'active',
        })
      ).rejects.toThrow(TRPCError)
    })

    it('should throw UNAUTHORIZED error for unauthenticated users', async () => {
      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      await expect(
        caller.create({
          name: 'New User',
          email: 'newuser@example.com',
          password: 'password123',
          level: 'USER',
          status: 'active',
        })
      ).rejects.toThrow(TRPCError)
    })
  })

  describe('destroy procedure', () => {
    it('should delete users with admin permissions', async () => {
      mockDb.delete.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(undefined as any)

      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.destroy({ ids: ['111111111111111111111111', '222222222222222222222222'] })

      expect(result).toEqual({ success: true })
      expect(mockDb.delete).toHaveBeenCalledWith(schema.user)
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(caller.destroy({ ids: ['1', '2'] })).rejects.toThrow(TRPCError)
    })
  })

  describe('update procedure', () => {
    it('should update user with admin permissions', async () => {
      const updatedUser = { id: '2', name: 'Updated User', level: 'USER', status: 'active' }

      mockDb.update.mockReturnValueOnce(mockDb)
      mockDb.set.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.returning.mockResolvedValueOnce([updatedUser] as any)

      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: { id: '1', level: 'ADMIN' },
        header: new Headers(),
      })

      const result = await caller.update({ id: '111111111111111111111111', name: 'Updated User' })

      expect(result).toEqual(updatedUser)
      expect(mockDb.update).toHaveBeenCalledWith(schema.user)
    })

    it('should throw UNAUTHORIZED error for non-admin users', async () => {
      const caller = userRouter.createCaller({
        db: mockDb as any,
        user: { id: '2', level: 'USER' },
        header: new Headers(),
      })

      await expect(caller.update({ id: '2', name: 'Updated User' })).rejects.toThrow(TRPCError)
    })
  })
})
