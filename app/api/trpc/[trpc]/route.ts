import { type NextRequest } from 'next/server';
import { appRouter } from "@/server/routers/_app";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/server/trpc";

const handler = async (req: NextRequest) => {
  const ctx = await createContext({ req });
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      return ctx;
    },
    onError: ({ error }) => {
      console.error("tRPC error:", error);
    },
    responseMeta() {
      const headersObj = Object.fromEntries(ctx.resHeaders.entries());

      return {
        headers: headersObj,
      };
    },
  });

  

  return response;
};

export { handler as GET, handler as POST };
