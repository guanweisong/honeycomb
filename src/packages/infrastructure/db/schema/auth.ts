import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";
import { objectId } from "../object-id";
import { withTimestamps } from "../timestamps";
import { UserLevel, UserStatus } from "@/packages/domain/identity/user";

const userLevels = [
  UserLevel.ADMIN,
  UserLevel.EDITOR,
  UserLevel.GUEST,
] as const;

const userStatuses = [
  UserStatus.DELETED,
  UserStatus.ENABLE,
  UserStatus.DISABLE,
] as const;

/**
 * 用户表 (user)
 * 存储系统用户信息。
 */
export const user = sqliteTable("user", {
  id: text("id").primaryKey().$defaultFn(objectId),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),
  image: text("image"),
  level: text("level", { enum: userLevels }).default(UserLevel.GUEST).notNull(), // 用户等级，默认为访客
  name: text("name").unique(),
  password: text("password"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  status: text("status", { enum: userStatuses })
    .default(UserStatus.ENABLE)
    .notNull(), // 用户状态，默认启用
  ...withTimestamps(),
});

/** Better Auth 账号表，保存 OAuth 账号和 credential 账号。 */
export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", {
      mode: "timestamp_ms",
    }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", {
      mode: "timestamp_ms",
    }),
    scope: text("scope"),
    password: text("password"),
    ...withTimestamps(),
  },
  (table) => ({
    accountUserIdx: index("account_user_id_idx").on(table.userId),
    accountProviderIdx: index("account_provider_idx").on(
      table.providerId,
      table.accountId,
    ),
  }),
);

/** Better Auth Passkey 凭据表，保存 WebAuthn 公钥和认证器元数据。 */
export const passkey = sqliteTable(
  "passkey",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull().unique(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: integer("backed_up", { mode: "boolean" }).notNull(),
    transports: text("transports"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    aaguid: text("aaguid"),
  },
  (table) => ({
    passkeyUserIdx: index("passkey_user_id_idx").on(table.userId),
  }),
);

/** Better Auth 数据库 session 表。 */
export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => ({
    sessionUserIdx: index("session_user_id_idx").on(table.userId),
  }),
);

export const loginHistoryEvents = [
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "SIGN_OUT",
  "REVOKE_OTHER_SESSIONS",
] as const;

/** Better Auth 登录安全事件表。 */
export const loginHistory = sqliteTable(
  "login_history",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }),
    event: text("event", { enum: loginHistoryEvents }).notNull(),
    provider: text("provider"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    loginHistoryUserCreatedIdx: index("login_history_user_created_idx").on(
      table.userId,
      table.createdAt,
    ),
    loginHistoryEventCreatedIdx: index("login_history_event_created_idx").on(
      table.event,
      table.createdAt,
    ),
    loginHistoryCreatedIdx: index("login_history_created_idx").on(
      table.createdAt,
    ),
  }),
);

/** Better Auth 验证码和验证链接表。 */
export const verification = sqliteTable(
  "verification",
  {
    id: text("id").primaryKey().$defaultFn(objectId),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...withTimestamps(),
  },
  (table) => ({
    verificationIdentifierIdx: index("verification_identifier_idx").on(
      table.identifier,
    ),
  }),
);

/**
 * 分类表 (category)
 * 存储文章或其他内容的分类信息。
 */
