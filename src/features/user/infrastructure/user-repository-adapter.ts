import type { UserRepository } from "../application/repository";
import type { CredentialPort, LoginHistoryPort, UserCommandPort, UserQueryPort } from "../application/repository";

/** 将组合 repository 适配为用例使用的窄端口。 */
export function toUserCommandPort(repository: UserRepository): UserCommandPort {
  return { create: (input) => repository.create(input), update: (input) => repository.update(input), destroy: (ids) => repository.destroy(ids) };
}
export function toUserQueryPort(repository: UserRepository): UserQueryPort {
  return { detail: (id) => repository.detail(id), current: (id) => repository.current(id), list: (input) => repository.list(input) };
}
export function toCredentialPort(repository: UserRepository): CredentialPort {
  return { update: (input) => repository.update(input) };
}
export function toLoginHistoryPort(repository: UserRepository): LoginHistoryPort {
  return { loginHistory: (userId) => repository.loginHistory(userId) };
}
