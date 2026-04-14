import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/packages/trpc/api/appRouter";

export type SettingEntity = inferProcedureOutput<AppRouter["setting"]["index"]>;
