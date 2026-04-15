import { describe, it, expect, beforeEach, vi } from 'vitest'
import { authRouter } from './auth.router'
import { TRPCError } from '@trpc/server'

// Mock database and related modules
vi.mock('@/packages/db/db', () => ({
  getDb: vi.fn(() => mockDb),
}))

// Mock validateCaptcha function
vi.mock('@/packages/trpc/api/libs/validateCaptcha', () => ({
  validateCaptcha: vi.fn().mockResolvedValue(undefined),
}))

const mockDb = {
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  delete: vi.fn(() => mockDb),
}

// Mock crypto.randomUUID
const mockUUID = 'test-uuid-12345'
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: vi.fn(() => mockUUID),
  },
})

describe('Auth Router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('me procedure', () => {
    it('should return current user when authenticated', async () => {
      const mockUser = { id: '1', name: 'Test User', level: 'ADMIN' }
      
      const caller = authRouter.createCaller({
        db: mockDb as any,
        user: mockUser,
        header: new Headers(),
      })

      const result = await caller.me()

      expect(result).toEqual(mockUser)
    })

    it('should return null when not authenticated', async () => {
      const caller = authRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.me()

      expect(result).toBeNull()
    })
  })

  describe('login procedure', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: '1',
        name: 'testuser',
        password: 'testpass',
        level: 'USER',
      }

      // Setup mock for user lookup
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([mockUser])

      // Setup mock for token insertion
      mockDb.insert.mockReturnValueOnce(mockDb)
      mockDb.values.mockResolvedValueOnce(undefined)

      const caller = authRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.login({
        name: 'testuser',
        password: 'testpass',
        captchaToken: 'valid-captcha',
      })

      expect(result).toEqual({ token: mockUUID })
      expect(crypto.randomUUID).toHaveBeenCalled()
    })

    it('should throw error with invalid credentials', async () => {
      // Setup mock for user lookup returning empty array
      mockDb.select.mockReturnValueOnce(mockDb)
      mockDb.from.mockReturnValueOnce(mockDb)
      mockDb.where.mockReturnValueOnce(mockDb)
      mockDb.limit.mockResolvedValueOnce([])

      const caller = authRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      await expect(
        caller.login({
          name: 'wronguser',
          password: 'wrongpass',
          captchaToken: 'valid-captcha',
        })
      ).rejects.toThrow()
    })
  })

  describe('logout procedure', () => {
    it('should successfully logout with valid token', async () => {
      // Setup mock for token deletion
      mockDb.delete.mockReturnValueOnce(mockDb)
      mockDb.where.mockResolvedValueOnce(undefined)

      const caller = authRouter.createCaller({
        db: mockDb as any,
        user: null,
        header: new Headers(),
      })

      const result = await caller.logout({ token: 'valid-token' })

      expect(result).toEqual({ success: true })
    })
  })
})
