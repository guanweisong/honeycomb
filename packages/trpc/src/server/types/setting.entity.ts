import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@honeycomb/trpc/server/appRouter";

export type SettingEntity = inferProcedureOutput<AppRouter["setting"]["index"]>;
