/**
 * 测试常量文件
 * 用于在单元测试中共享常用的测试数据ID
 */

export const TEST_IDS = {
  /** 24个字符的ID，用于测试 */
  ID_1: '111111111111111111111111',
  ID_2: '222222222222222222222222',
  ID_3: '333333333333333333333333',
  ID_4: '444444444444444444444444',
  ID_5: '555555555555555555555555',
} as const

export const TEST_USERS = {
  /** 管理员用户 */
  ADMIN: {
    id: TEST_IDS.ID_1,
    name: 'Admin User',
    email: 'admin@example.com',
    level: 'ADMIN' as const,
  },
  /** 编辑用户 */
  EDITOR: {
    id: TEST_IDS.ID_2,
    name: 'Editor User',
    email: 'editor@example.com',
    level: 'EDITOR' as const,
  },
  /** 普通用户 */
  USER: {
    id: TEST_IDS.ID_3,
    name: 'Regular User',
    email: 'user@example.com',
    level: 'GUEST' as const,
  },
} as const
