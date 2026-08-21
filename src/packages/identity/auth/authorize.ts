import { can, type Permission } from "./permissions";

export interface AuthorizationContext {
  readonly role: string | null | undefined;
  readonly permission: Permission;
}

/**
 * 所有服务端入口共享的最小授权策略。
 * 入口负责把会话转换为 context，不得自行复制角色判断。
 */
export function authorize(context: AuthorizationContext): boolean {
  return can(context.role, context.permission);
}
