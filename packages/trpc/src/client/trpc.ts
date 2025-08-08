import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client/links/httpBatchLink";
import type { AppRouter } from "../server";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "http://127.0.0.1:7002/api/trpc",
      transformer: superjson,
      headers() {
        const token =
          typeof window !== "undefined" ? localStorage.getItem("token") : null;
        return {
          "x-auth-token": token ?? "",
        };
      },
    }),
  ],
});
