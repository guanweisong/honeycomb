import { appRouter } from "./appRouter";
import { createContext } from "./context";

export const serverClient = appRouter.createCaller(await createContext({}));
