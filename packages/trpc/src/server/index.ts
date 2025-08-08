import { router } from "./core";
import { linkRouter } from "./routers/link";

export const appRouter = router({
  link: linkRouter,
});

export type AppRouter = typeof appRouter;
