import { type NextRequest } from 'next/server';
import { appRouter } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/server/trpc";

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      return createContext({
        req: req as any, // Cast to any to avoid type issues with NextRequest
      });
    },
    onError: ({ error }) => {
      console.error("tRPC error:", error);
    },
  });

export { handler as GET, handler as POST };
