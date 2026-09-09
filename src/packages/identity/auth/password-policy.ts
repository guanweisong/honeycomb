import { z } from "zod";

export const CREDENTIAL_PASSWORD_MIN_LENGTH = 6;
export const CREDENTIAL_PASSWORD_MAX_LENGTH = 128;

export const CredentialPasswordSchema = z
  .string({ message: "登录密码不能为空" })
  .min(
    CREDENTIAL_PASSWORD_MIN_LENGTH,
    `登录密码不能少于 ${CREDENTIAL_PASSWORD_MIN_LENGTH} 个字符`,
  )
  .max(
    CREDENTIAL_PASSWORD_MAX_LENGTH,
    `登录密码不能超过 ${CREDENTIAL_PASSWORD_MAX_LENGTH} 个字符`,
  );

export function assertCredentialPassword(password: string): void {
  const result = CredentialPasswordSchema.safeParse(password);
  if (!result.success) {
    throw new Error(
      `Password must contain ${CREDENTIAL_PASSWORD_MIN_LENGTH} to ${CREDENTIAL_PASSWORD_MAX_LENGTH} characters`,
    );
  }
}
