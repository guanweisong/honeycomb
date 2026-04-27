import { DefaultSession } from "next-auth";
import { UserLevel } from "@/packages/trpc/api/modules/user/types/user.level";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      level: UserLevel;
      name: string | null;
      email: string | null;
    };
  }

  interface User {
    id: string;
    level: UserLevel;
    name: string | null;
    email: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    level?: UserLevel;
    name?: string | null;
    email?: string | null;
  }
}
