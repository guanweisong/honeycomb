import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/server/appRouter";

export type SettingEntity = inferProcedureOutput<AppRouter["setting"]["index"]>;
