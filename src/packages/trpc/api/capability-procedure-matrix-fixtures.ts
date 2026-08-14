import { UserLevel } from "@/packages/domain/identity/user";

/** 权限矩阵测试共享的稳定输入数据。 */
export const ALL_ROLES = [UserLevel.ADMIN, UserLevel.EDITOR, UserLevel.GUEST] as const;
export const ADMIN_EDITOR = [UserLevel.ADMIN, UserLevel.EDITOR] as const;
export const ADMIN_ONLY = [UserLevel.ADMIN] as const;
export const TEST_ID = "0123456789abcdef01234567";
export const LIST_INPUT = {};
export const DELETE_INPUT = { ids: [TEST_ID] };
export const I18N_INPUT = { en: "Test", zh: "测试" };
