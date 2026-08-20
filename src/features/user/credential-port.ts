import type { UserRecord } from "./ports";

/** 用户凭据变更端口，与用户资料读写隔离。 */
export interface CredentialPort {
  update(input: { id: string; password: string }): Promise<UserRecord>;
}
